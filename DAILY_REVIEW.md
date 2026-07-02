## 2026-07-02

> 例行无人值守巡检：build 健康度 + 仓库卫生。距 7-01 巡检共 **24 个 commit**（`4d35916` 之后 → `4321226` 为止），基本全是站主亲手在做的三条主线：① **机票监控（flightwatch）Phase 1 收口 + Phase 2 后端 pipeline 全落地 + Phase 3 起步 + 上线** —— 从 6-30 只是 `_flight-staging/` 内部设计稿，一天之内完成 a11y 键盘/读屏收口、品牌改名「机票监控」、样张航线中性化、邮件文案 AI 触发价澄清、盯票码前端编解码 + 交接页动态还原、判断层多厂商 provider:model 分发 + 简单模式（阈值比价·无 AI·零密钥） + 完整模式（judge_api.py 直连 Anthropic API）、config.py 配置桥、scrape.py 真机端到端跑通、notify + platform（mac 适配）、flightwatch CLI 编排、Phase 3 一键安装器 `flight/get`、AI 模型选择器移动至安装手册、通知卡/直飞/日期双呈现·实时同步、日历角标内收 + 到达日星形 ✧→✦ 对称、频率并入通知卡紧凑内联、迁入公开 `toolbox/flight/`（5 个 HTML + PWA `manifest.json` + apple-touch-icon + 4 张 flight-icon-{192,512,maskable-512}.png + 2 张 flight-icon{,-maskable}.svg + `_data/toolbox.yml` 新增 flight 条目），前端 UI 从 `_flight-staging/` 迁到公开 `toolbox/flight/` 出站、后端 runner 仍留 `_flight-staging/runner/` 里（10 个 Python 模块共 1600+ 行 + install/get.sh 137 行 + README.md 55 行），一键安装器通过 `raw.githubusercontent.com/…/main/_flight-staging/runner/` 拉取（`flight/get:21` 显式硬编码路径）—— 前端已上线，后端保留 `_-`前缀私密目录 + `_config.yml` 显式 exclude 双保险不进 Jekyll build。② **《经济学博士的数学工具箱》原创中文数学教材首发**（`b285652`）—— 8 部分 / 42 章 / 447 页 XeLaTeX + ctexbook 排版，本次一次性入仓：`_notes/study/econ-math-toolkit/econ-math-toolkit.md`（front-matter + 76 条中英 keywords + 800 字 summary，`sub_category=经济学数学基础`，author=周睿，date=2026-06-27）+ `files/econ-math-toolkit/econ-math-toolkit.pdf`（3.02 MB rendered PDF）+ `files/econ-math-toolkit/source/main.tex` / `commands.tex` / `theorems.tex` + 42 个 `chapters/ch{1..42}_*.tex`（每章 200-500 行，共 ~15,000 行 LaTeX 源）+ `docs/econ-math-toolkit-playbook.md`（章节写作方法论）+ `docs/workflows/econ-math-write-part.workflow.js`（自动化写作 workflow 171 行）。**站主自认领的原创教材**，非搬运，是继 5-25 灵敏度分析原创教材、6-16 中级宏观 & 6-24 Strang 线代英文姊妹版之后又一大部头讲义上架。③ **`study_order` 双双补齐**（`39e36f3` + `faab25c`）—— 承接 6-01 起 P1、6-24 起 P1，站主两天内直接把 `econ-math-toolkit` 与 `linear-algebra` 分别登记进 `_config.yml` L90/L92（数学组，位置在 `real-anal` 之前，即 econ-math-toolkit → real-anal → linear-algebra 三档梯度）—— **昨日 P1#2「linear-algebra 缺 study_order」7 日承接 + 昨日隐含 P1「econ-math-toolkit 缺 study_order」0 日承接双双消除**，`/notes/index.html` 数学组现完整渲染 `econ-math-toolkit` / `real-anal` / `linear-algebra` 三档。次要三条：④ **宠物中心三个 fix**（`6bf56d2` contactNicknames 免被 CloudSync 覆盖冲掉、`2503688` 食物两级可折叠目录、`55ba53b` 趋势图今日时段逐日翻看 + 目标参考线按当时目标分段渲染）；⑤ **`cat-soundboard` 新增两种情境喵**（`8a85eb1` 等饭喵 / 落单喵 + 播放有效区间机制 + 2 个新音频文件 `meow-food.mp3` 7.79 KB / `meow-lonely.mp3` 8.21 KB）；⑥ **`toolbox/picker`**（`75a4b99` 权重必为正数 + 支持小数精调 + 恢复等权按钮 + 转盘与图表并排不再被导航裁切 + 选项名回车推进）。
>
> `bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（14.45 s cold build）。`_site/` 顶层 26 项（比 6-30 的 25 项 + 1 项 = `flight/` 顶级目录，仅含 `get` 一个 6.7 KB bash 安装脚本，无 front-matter → Jekyll 原样 copy 到 `_site/flight/get`；`grep "/flight/get" _site/sitemap.xml` 命中 0 次 —— 非 HTML 文件 jekyll-sitemap 默认不收录，行为正确），无任何 `_flight-staging/` / `_paid/` 泄露。`_site/toolbox/index.html` 已把 flight 卡渲染在生活工具组内（`grep -c "/toolbox/flight/"` 4 次命中），且 `bulk-offline-toolbox` shortcut 列表末尾把 `/toolbox/flight/` 加入 live_tools 集合。`_site/notes/index.html` 数学组现渲染 `econ-math-toolkit` 与 `linear-algebra` 各 1 次（`grep -c` 已核对）。`_site/search.json` 已收录 `机票监控` / `econ-math-toolkit` / `linear-algebra` 各 2 次（一次 note 页 title、一次 permalink），搜索体系闭环。**今日 0 项自动修复**——24 个 commit 全部合规、build 健康、仓库卫生达标；`study_order` 缺项由站主亲手在同日 commit 里补齐，昨日 P1#2 已消除、无隐含新 P1 产生，没有可动的「小而无争议」改动。**P1 队列进一步压缩**：昨日两条 P1（linear-algebra / econ-math-toolkit 缺 study_order）都已消除，**唯一仍留的 P1** 是承接 20 日的 `interm-econometrics` —— 今日核对 `comm -23 <(ls _notes/study/) <(grep '^  - ' _config.yml study_order block)` 差集只剩 `interm-econometrics` 一条（`_notes/study/interm-econometrics/interm-econometrics-2023.md` 仍在，未被合并或改名），承接不变。**P2 队列**：① 昨日 P2#1「`linear-algebra-strang.md` summary 引用「本站中文《线性代数讲义》」但仓库不存在」**性质微妙变化**——今日新上《经济学数学工具箱》里 ch1-ch7 覆盖了 7 章线性代数（`ch1_vector_spaces` / `ch2_rank_linear_systems` / `ch3_projection_ols` / `ch4_eigen_diagonalization` / `ch5_spectral_quadratic` / `ch6_svd` / `ch7_matrix_calculus`），可视为中文线性代数材料的"部分承载"，但书名不同（是《经济学数学工具箱》而非《线性代数讲义》）且面向经济学博士（不是纯粹的线性代数教材），**读者按 strang.md summary 里「本站中文《线性代数讲义》」字面找仍找不到对应条目**；仍是文案与真实结构不一致，请你决定 —— 保留字面等待中文《线性代数讲义》独立成册，或改字面为「本站《经济学数学工具箱》线性代数部分」并链过去。② `_flight-staging/` 目录名与其内容的实际角色开始不匹配（**今日新观察**）—— 目录里的 `runner/` 已经是**上线机票监控工具的生产后端**（前端 `flight/get` 一键安装器硬编码从 `raw.githubusercontent.com/…/main/_flight-staging/runner/` 拉取），命名沿用「设计稿暂存」阶段的 `-staging` 语义会误导 —— 但重命名会涉及一键安装器 URL 迁移、影响已装用户下次更新，属产品迁移决策；本项列入 P2 由你拍板。③–⑨ 承接昨日多条老 P2（`bare_dollar.py` 启发式、`spotcheck.py` `.tex` 探测、`tutoring/` 7 篇缺 summary、`paid-test-us-visa-types.md` 脚本重生、`mao-thought-principles.md` 无 summary 字段但正文有介绍段、`toolbox/random/` hover 缩进 cosmetic、mid-2015/anova-R 互链、jukebox 16 首、掼蛋真机联机回归、宠物中心多浏览器验收、5 条 DNS 外链、SVG xmlns 误判）—— 今日均未主动跑 `scripts/audit/run.sh` 全套（未在无人值守流程里跑，仅做 build + 结构 + 关键渲染核对），承接昨日结论、无新观察。

### ✅ 本次已自动修复

无。

24 个 commit 全部由站主亲手在做且已 push 到 main（机票监控 Phase 1 收口 + Phase 2 后端 + Phase 3 起步 + 上线、《经济学数学工具箱》教材上架、`study_order` 双补齐、宠物 / cat-soundboard / picker 三个小 feat）——所有内容均属大改动 / IA 调整 / 新工具首发范畴，需要设计判断 / 内容策展、不属于"小而无争议"范畴，本 agent 一律不擅改；build ✅ / `_site/` 无泄露 / `study_order` 缺项已由站主 commit 补齐、无任何低风险小修可做。

### 📋 待你把关

#### P0（紧急）

无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 ~ 7-01，**第 20 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、120 页 Wooldridge 体系英文讲义、94 keywords 厚足覆盖）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 仍 26 个目录（较昨日 25 个 +1 = 新增 `econ-math-toolkit/`）、`study_order` 现 25 条（较昨日 23 条 +2 = `econ-math-toolkit` + `linear-algebra`），`comm -23` 差集从昨日的 `econ-math-toolkit` + `interm-econometrics` + `linear-algebra` 三条压缩到今日**只剩 `interm-econometrics` 一条**。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）仍属设计判断，请你拍板 —— 承接 20 日，是仓库里最久的 P1。

#### P2（建议）

1. **`linear-algebra-strang.md` summary 里「本站中文《线性代数讲义》」的引用性质更新**（承接 6-24 ~ 7-01，**今日更新性质**）—— 今日新上《经济学数学工具箱》里 ch1-ch7 覆盖了 7 章线性代数（`ch1_vector_spaces` / `ch2_rank_linear_systems` / `ch3_projection_ols` / `ch4_eigen_diagonalization` / `ch5_spectral_quadratic` / `ch6_svd` / `ch7_matrix_calculus`），从内容上说线性代数中文材料**在站上已部分存在**——但书名不同（是《经济学数学工具箱》而非《线性代数讲义》），面向经济学博士（不是独立的线性代数教材），且这 7 章嵌在 42 章大部头里、并不是"独立中文《线性代数讲义》"。读者按 strang.md summary 字面搜「本站中文《线性代数讲义》」仍会**找不到独立条目**（`grep "course.*线性代数" _notes/study/` 只命中 strang 一篇，不命中工具箱）。三种可能改法：① 保留字面，等以后写独立中文《线性代数讲义》再放出；② 改字面为「本站《经济学数学工具箱》线性代数部分（ch1-ch7）」并链过去；③ 删去引用改成自足介绍。**属内容写作 + 结构映射决策，请你拍板**。

2. **`_flight-staging/` 目录名与其内容实际角色不匹配**（**今日新观察**）—— 目录里的 `runner/` 已是**已上线机票监控工具的生产后端**（`flight/get:21` 硬编码从 `https://raw.githubusercontent.com/ruizhou03/ruizhou03.github.io/main/_flight-staging/runner` 拉取，走 GitHub raw 而非 Jekyll，故 `_config.yml` exclude 拦不住外部 curl 读取），但目录名沿用「设计稿暂存」阶段的 `_-staging-` 语义会误导后来者以为是"半成品"。三种可能改法：① 保留名字（认清现状，`-staging` 已成沉默约定）；② 把 `runner/` 挪出到 `flightwatch/runner/`（去 `_-`前缀 + 明确工具名），需要同步改 `flight/get:21` 的 SRC 常量、并让新旧 URL 平滑迁移（否则已装用户下次更新 runner 时会 404）；③ 整个 `_flight-staging/` 改名 `_flightwatch/`（保 `_-`前缀防 Jekyll 收录），只改 URL 前缀、结构最小。**属命名 / 迁移设计决策，请你拍板**。

3. **`scripts/audit/bare_dollar.py` 启发式漏判 `$\d+-...$` 类数学配对**（承接 6-30 ~ 7-01）—— 今日**未跑** audit 脚本；老待办承接，风险极低、纯减小 false-positive 命中；仍属脚本逻辑改动、请你拍板。

4. **`scripts/audit/spotcheck.py` 的 `.tex 源` 探测启发式仍漏判带主题后缀和异目录情形**（承接 6-27 ~ 7-01）—— 今日**未跑** audit 脚本；老待办承接。新上的《经济学数学工具箱》的 42 个 `.tex` chapter 源文件均在 `files/econ-math-toolkit/source/chapters/`，如果日后 spotcheck 抽到 `files/econ-math-toolkit/econ-math-toolkit.pdf`，脚本的 `fp.with_suffix(".tex")` 只查 `files/econ-math-toolkit/econ-math-toolkit.tex` 会漏判——脚本待修完后可覆盖此情形。

5. **`_notes/tutoring/` 10 篇里 7 篇缺 `summary` 字段**（承接 6-30 ~ 7-01）—— 老文盘扫待办，属内容写作决策。

6. **`_notes/life/paid-test-us-visa-types.md` 缺 `summary` 字段且无法直接改**（承接 6-30 ~ 7-01）—— 需改源文件 `_paid/liuxue-test-visa.md` 或改 `scripts/paywall/build_paid.py`。

7. **`_notes/study/mao-thought/mao-thought-principles.md` 无 `summary:` 字段但正文 L17 是介绍段落**（承接 6-29 ~ 7-01）—— 写作偏好；PDF-only 页面有正文时 `post.html` 兜底不触发，渲染上不缺。

8. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接 6-03 ~ 7-01。功能正确，纯排版风格小差异，可忽略。

9. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接 6-03 ~ 7-01。属内容写作决策。

10. **掼蛋 6-18 ~ 6-24 联机改造 + 6-30 四象限版型迁移待真机 / 微信内置浏览器跑两局完整联机回归**（承接 6-27 ~ 7-01）。沙箱无浏览器 / 无音频出口无法替代真机回归。

11. **宠物中心近期多轮更新待多浏览器 / 多设备验收**（承接 6-29 ~ 7-01；今日 `6bf56d2` 联系人昵称防覆盖 + `2503688` 食物两级折叠目录 + `55ba53b` 趋势图逐日翻看 + 目标参考线分段渲染四改动加入）—— 建议 iPhone Safari + Android Chrome + 桌面 Chrome + 桌面 Firefox + PWA standalone 至少五组合下过 board 一遍。沙箱无 GUI / 无真触屏，跑不了。

12. **机票监控 Phase 3 一键安装器 `flight/get` + Phase 2 后端 pipeline 待 mac 真机端到端跑一轮验收**（**今日新观察**）—— `07ec983` commit message 已注明"scrape.py 真机验证 —— 整条 pipeline 端到端跑通"，说明站主已在 mac 上真机跑通了 `scrape → judge → notify` 环；但一键安装器 `flight/get`（Phase 3 起步）刚落地一日，`curl -fsSL https://ruizhou03.com/flight/get | bash -s -- <盯票码>` 完整入口 = 建 venv + Playwright + LaunchAgent + 首轮 + 定时的**装机链路**是否在**空白 mac**（未预装任何 flightwatch 相关物）上一次成功、以及**已装用户后续 flightwatch 命令**更新 runner 会不会因 `_flight-staging/` 名字变动等回归问题，建议真机装机 / 卸装 / 更新三步整流一次。沙箱无 mac 出口跑不了。

13. **`toolbox/flight/` 5 个 HTML 页 UX 待多浏览器 / 多屏幕跑一遍**（**今日新观察**）—— `index.html` 793 行 / `manual.html` 259 行 / `handoff.html` 166 行 / `ticket-detail.html` 307 行 / `email-digest.html` 164 行 均已发布前巡查（6-30 P2#13 记录 10 维度多 agent + 对抗复核 103 条发现）零风险修复过；此次上线后建议 iPhone Safari + Android Chrome + 桌面 Chrome + 桌面 Firefox + PWA "加装到主屏" 至少五组合下过完整配置→保存→交接→查看单票四步骤一遍。沙箱无 GUI 跑不了。

14. **《经济学博士的数学工具箱》教材首发内容待你确认三项**（**今日新观察**）—— ① summary 里 800 字长概述（现 L4）内容详实、覆盖 8 部分脉络 + 三件套写法 + 面向读者，但 800 字对 landing 页 note-card 可能偏长（`_layouts/post.html` 与 `_includes/note-card.html` 处理超长 summary 的行为需核对）；② `sub_category=经济学数学基础` 是**新分类字符串**（历史站里未出现过，`grep "sub_category.*经济学数学" _notes/` 只命中这一篇），若将来还会有相邻教材（如"经济学统计基础"）值得先想清楚这条侧栏走向；③ `discipline=数学`（数学组）与 `main_category=学习资料` 归类都合适，但 `course=经济学数学工具箱` 是否要挂进 `_data/course_aliases.yml`（让读者搜"经济数学"、"math for economists" 等口语词也能找到）建议站主与 `search-keywords` skill 一并处理。

15. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 承接 6-18 ~ 7-01。

16. **5 条 DNS NameResolutionError 外链需站主在生产环境复验** —— 承接 6-08 ~ 7-01；今日**未跑** `dead_links.py`（仅周一跑）。

17. **`dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间字符串误判为外链** —— 承接 6-08 ~ 7-01。cosmetic 非阻塞。

### 🗂 仓库卫生

**结构较昨日有 3 处变动**（`git diff --stat 4d35916..HEAD` 显示 24 个 commit 共触及 89 个文件、+21,239 / -1,165 行）——① **新增顶级目录 `flight/`**（含 1 文件 `flight/get` 6.7 KB bash 安装脚本，无 front-matter → Jekyll 原样 copy 到 `_site/flight/get`；`grep "/flight/get" _site/sitemap.xml` 命中 0 次，非 HTML 不被 jekyll-sitemap 收录，行为符合预期）；② **新增 `toolbox/flight/` 5 个 HTML 页 + `manifest.json` + `_data/toolbox.yml` 一条 entry**（前端设计稿从 `_flight-staging/` 迁到公开出站，机票监控工具正式上线，`_site/toolbox/index.html` 已在生活工具组渲染 flight 卡片、bulk-offline shortcut 列表纳入 `/toolbox/flight/`）；③ **新增 `_notes/study/econ-math-toolkit/` 教材目录 + `files/econ-math-toolkit/` PDF + 源码**（1 个 md 主 note、1 个 3.02 MB PDF、45 个 tex 文件、1 个 playbook + 1 个 workflow），首上《经济学博士的数学工具箱》。**审计通过**：① **敏感信息扫描** `grep -rE "psu\.edu|周睿|ruizhou|@gmail|@qq|127\.0\.0\.1|password|secret|api[_-]key" toolbox/flight/ flight/` 只命中两条 —— `toolbox/flight/manual.html` 里的 `you@gmail.com`（收件邮箱占位符）和「应用专用密码 / App passwords」（Gmail 功能名说明文本），非泄露；② **上线核对**——`find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空，`_config.yml` L52 `- _flight-staging/` 仍在（对应 runner/ Python 后端不入站，虽然它可通过 `raw.githubusercontent` 直读，但那是 GitHub raw 而非 Jekyll build 路径），双保险成立；③ **本机 workspace 卫生**——`git status` clean、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、副本文件 `find . -name "* 2.*"` 全空，无编辑器 / 系统垃圾、无 LaTeX 中间产物泄露（`files/econ-math-toolkit/source/` 只含 `.tex` 源与 `chapters/` 子目录，无 `.aux` / `.log` / `.toc` / `.out` 中间产物）；④ **大文件核对**——新增 `files/econ-math-toolkit/econ-math-toolkit.pdf` 3.02 MB（低于 `images.py` 的 5 MB 阈值即不列入待压缩，参考 `files/or/or-2023.pdf` 5.55 MB 才是 pdfslim 潜在候选），承接 `files/interm-macro/interm-macro-2022-zh.pdf` 2.23 MB 一起构成 2 MB 以上文件二人组，`files/or/or-2023.pdf` 5.55 MB 仍是唯一 5 MB 以上大文件；⑤ **`.gitignore` 状态未变**——`_paid/*` / `EMAIL_SUMMARY.md` / `_site/` / `.jekyll-cache/` 等全部约定条目在位。**结论**：三处新增（`flight/` 顶级 + `toolbox/flight/` 前端 + `_notes/study/econ-math-toolkit/` 教材）归属清晰、隔离到位、内容干净；`_flight-staging/runner/` 后端保留但双保险到位；仓库其它区域与 7-01 一致，无可优化空间。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点本次**未主动跑** `backend_pulse.py`（沙箱无 fly.io 出口，承接 6-04 ~ 7-01 每次巡检结论）。**今日 24 个 commit 分布**：机票监控 15 个 commit 涉及**新前端 UI + 新后端 runner Python 层**（`_flight-staging/runner/` 10 个 Python 模块 + `install/get.sh` 安装器），机票监控自身**不依赖站点后端三件套**——它是站主本机运行的 Python daemon（scrape / judge / notify），与 fly app 无耦合；一键安装器 `flight/get` 通过 `raw.githubusercontent` 拉取，不走站点 Jekyll build；《经济学数学工具箱》教材内容层（`b285652`）无后端调用改动；`study_order` 补齐（`39e36f3` / `faab25c`）纯 Jekyll 配置；宠物 / cat-soundboard / picker 均为前端小改动。**结论**：24 个 commit 未新增任何对 zircon-urge / leaderboards / zircon-comments / paid 端点的依赖，站点后端配置维持稳定。

---

## 2026-07-01

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（今日周三 DOW=3，未跑 dead_links / orphan_files / pii_scan 三项周一项；**DOM=01，加跑 monthly_stats**——本月首日，7 月尚无新文章）。距 6-30 巡检共 **6 个 commit**（`baa12e4` 之后 → `7a5702e` 为止）：`111a30d` 为昨日自动巡检 commit（DAILY_REVIEW.md 更新）；`916d716` **掼蛋牌面迁移四象限版型 + 矢量花色 + 横竖双构图**（`toolbox/doudizhu/index.html` + `assets/js/doudizhu/ui.js` 共 2 文件、+155/-142 行）—— 与前段时间掼蛋卡面参数化同一美术线；`5e222cd` / `b2da4c6` / `a132bf3` 是管理后台连做的 **3 篇 `_notes/life/` 生活攻略"真隐藏(hidden)"操作**（condoms-guide.md / wipe-after-pee.md / standing-vs-sitting-urination.md 各删掉正文只保留 front-matter，属站主内容策展决策）；**`7a5702e` 是新出现的一条大改**——把之前散在 `/tmp` 的 5 个「机票捡漏」设计稿页面物化进 **`_flight-staging/`** 目录（`_-`前缀，Jekyll 构建默认排除，未上线），并做了发布前巡查（10 维度多 agent + 对抗复核 103 条发现）的零风险修复（隐私 P0 删预填 Gmail、复制按钮 bug、拖拽 draggable 复位、镂空圆点 CSS 自相矛盾、文案诚实化、prefers-reduced-motion / role=status 可达性、窄屏留白等），另配置页空态化 + 去重复渲染（按定档决策）。`bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（15.201 s cold + 7.255 s 二跑，均含 monthly_stats DOM=01 加跑）。今日 `scripts/audit/run.sh` 全套审计 **13/13 每日项 + monthly_stats 全跑完**——`keywords_coverage`（散文 121 篇全部充足，与 6-27 / 6-28 / 6-29 / 6-30 完全一致，本月零新增文章零变动）/ `images`（仅 `files/interm-macro/interm-macro-2022-zh.pdf` 2.13 MB 大文件，承接 6-16 ~ 6-30，markdown 入口正常）/ `material_type_enum`（**分布完全无变化**：Notes ×46 / Exams ×40 / 课程测评 ×18 / 经验之谈 ×5 / 错题本 ×3 / 写作 ×2 / 口语 ×1 / 词汇 ×1，承接 6-27 ~ 6-30）/ `filename_convention` / `hover_no_media`（新增的 `_flight-staging/*.html` 因不在 toolbox/ 扫描范围外，且其自身 `:hover` 均属 landing 页视觉效果，脚本正确不动它）/ `sibling_crosslink`（10 个 ≥3 篇 sub_category 组全互链）/ `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检见下）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-30）—— 这 12 项全 clean。**仅 `bare_dollar` 报 1 条命中**：`_notes/study/adv-micro-psu/adv-micro-psu-2026.md`（body L91）的「正是 `$1-F(x)$` 这个概率质量」—— 与昨日 6-30 完全同一条、同一位置、同一性质：**完整配对的 KaTeX 数学公式**，脚本启发式漏判（已列 P2 待办第 2 条）。**monthly_stats 首日跑**：全站 269 篇（life 122 / study 75 / research 24 / course-reviews 18 / tutoring 10 / essays 7 / gre 7 / toefl 6），sub_category TOP: 生活之问 63 / 菜谱 32 / 留学攻略 25 / 公司财务管理 17 / R 教程 11 / 心理统计Ⅰ 8 / 实分析 8；本月新增 0 篇（7 月刚开始）、最近 30 天新增 0 篇；字数中位数 2641 字、最长 70908 字、最短 0 字（PDF-only 存档）、平均 4833 字——**分布数据与 6-01 上月月末保持一致，本月尚无内容改动**。**今日 1 项自动修复**：`_config.yml` 的 `exclude:` 列表新增 `_flight-staging/`（详见"✅ 本次已自动修复"）——仅为文档化与防御式冗余（Jekyll 默认已排除 `_-`前缀目录，验证 build 后 `_site/` 内无任何 flight 痕迹），与既有 `_paid/` 同类"gitignore + 构建排除双保险"模式对齐；**风险为零**：改一行 YAML、不改任何文章内容、不改 IA、二次 build 已 ✅ 验证通过。**P1 队列**：承接昨日两条 `study_order` 缺项——①承接 13 日的 `interm-econometrics`（**第 19 日承接**）、②承接 1 日的 `linear-algebra`（**第 8 日承接**），核对 `comm -23` 差集仍是这两条；都属 IA 设计判断、不擅改。**P2 新观察**：① 昨日 P2#13 误报——`_notes/study/corp-fin/mid-2018.md` 实际**已有 `summary` 字段**（`git log` 显示 6-19 首次 commit 时即含 summary L6"公司财务管理 2018 年期中试卷原题…Coke 教授班用卷。"），昨日抽检 3/10 认定"缺 summary"系误判，今日核对纠正；② `mao-thought-principles.md` 无 `summary:` 字段但正文 L17 是一整段介绍文（"本文是笔者备考 2023 年春季…"），功能上不影响 PDF 页面显示（有正文时导语兜底不触发），yesterday P2#14"承接 6-29"实为无害。

### ✅ 本次已自动修复

**1. `_config.yml` 的 `exclude:` 列表新增 `_flight-staging/`**

- **触发**：昨日 `7a5702e` 新增了 `_flight-staging/` 目录（5 个 HTML 设计稿），未在 `_config.yml` 的 `exclude:` 列表内显式列出。
- **背景**：Jekyll 默认已排除所有 `_-`前缀目录（除非该目录被声明为 `collections`），因此该目录本身**已不进 `_site/`**（本次 build 已核对 `find _site -path "*_flight-staging*"` 空、`find _site -iname "*flight*staging*"` 空、`_site/` 顶层 25 项无任何 flight 相关文件）；但仓库既有约定是：**私密 `_-`前缀目录**（如 `_paid/`，付费文章全文源）在 `_config.yml` 的 `exclude:` 里显式列一遍，注释写清"gitignore + 构建排除双保险"用意。`_flight-staging/` 与 `_paid/` 完全同类——都是尚未上线的私密设计 / 内容源，应遵循同样的"belt-and-suspenders"模式。
- **改动**：`_config.yml` `_paid/` 之后新增两行——`# 机票捡漏（设计稿）：暂存在 _-prefixed 目录，仅本地/设计评审，绝不进站` + `- _flight-staging/`。共 +2 行、-0 行。
- **验证**：改后 `bundle exec ruby -e Jekyll::Commands::Build.process(...)` 二次 build ✅ 通过、零 warning、零 error（7.255 s，warm）；`_site/` 顶层结构仍是 25 项、无任何 flight 痕迹；exclude 列表现在覆盖 `_paid/` `_flight-staging/` 两个 `_-`前缀私密目录（`_notes/` 因是 collection 不必列，Jekyll 会自动处理）。
- **性质自评**：属"小而无争议"范畴——仅一行 YAML 声明，遵循既有 `_paid/` 同模式约定；即便去掉这行 Jekyll 也会因 `_-`前缀自动排除，改动风险为零、仅提升配置可读性 / 防御性。

### 📋 待你把关

#### P0（紧急）

无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 ~ 6-30，**第 19 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、120 页 Wooldridge 体系教科书式英文讲义、94 keywords 厚足覆盖）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 仍 25 个目录、`study_order` 仍 23 条，`comm -23` 差集仍是 `interm-econometrics` / `linear-algebra` 两条，承接昨日不变。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）属设计判断，仍请你拍板。

2. **`_config.yml` 的 `study_order` 仍未列 `linear-algebra` 文件夹**（承接 6-24 ~ 6-30，**第 8 日承接**）—— `dfbb84c` 6-24 新建的 `_notes/study/linear-algebra/linear-algebra-strang.md` 因 `study_order` 没列 `linear-algebra`，**在 `/notes/index.html` 数学组里渲染不出来**（sitemap / search.json / `_site/notes/linear-algebra/linear-algebra-strang.html` 都正常输出，仅 landing 缺）。`_config.yml` 中数学组当前只有 `real-anal` 一条；自然位置是放在 `real-anal` 之前（线性代数比实分析更基础）。**但放在何处属顺序判断，且未来可能还会加中文版**（详见 P2#1），故仍写进待办由你拍板。

#### P2（建议）

1. **`linear-algebra-strang.md` 的 summary 引用「本站中文《线性代数讲义》」但仓库内仍不存在**（承接 6-24 ~ 6-30）—— `grep "course.*线性代数" _notes/study/` 仍只命中 strang 这一篇，未发现中文姊妹版。summary 最后一句「这是本站中文《线性代数讲义》之外，按 Strang 教法重构的英文姊妹篇」会让读者点过去找不到中文版。两种可能：① 中文版还在 LaTeX 化排队待上线 → 等中文版落地再放出；② 临时占位文案 → 删去「之外，按 Strang 教法重构的英文姊妹篇」这句、改成自足介绍。**属内容写作判断、请你拍板**。

2. **`scripts/audit/bare_dollar.py` 启发式漏判 `$\d+-...$` 类数学配对**（承接 6-30）—— 今日唯一一条 audit 命中即为该漏判：`_notes/study/adv-micro-psu/adv-micro-psu-2026.md` L91（正文 L106）「正是 `$1-F(x)$` 这个概率质量」。脚本流程：见到 `$1`（数字），消费 `1` 后下一字符是 `-`（不在「`$\^_{}`」跳过集，也不是 `\d+/\d+` 分数 fallback 集），于是认作裸金额。但 `$1-F(x)$` 是平衡的 KaTeX 数学公式（开头 `$` 后续紧跟字面数学表达，而非货币 amount）。**建议修复**：把 L114-130 那段「数字后跟 `-`」也纳入跳过条件——具体可以是「`$\d+...` 后续若在同段同行内能找到下一个未转义 `$`、且 `$...$` 内容含字母 / `(` / `\\` 等数学 token 而非纯逗号-小数点-空格-单位词」，则视为公式跳过。属审计脚本启发式增强、风险极低、纯减小 false-positive 命中——但仍是脚本逻辑改动，**自评不属"小而无争议"范畴，列入待办由你拍板**。

3. **`scripts/audit/spotcheck.py` 的 `.tex 源` 探测启发式仍漏判带主题后缀和异目录情形**（承接 6-27 ~ 6-30）—— L185 `fp.with_suffix(".tex")` 只查同路径同基名 `.tex`。今日 pdf_archive 抽检 5 项中，`files/psy-stat-I/anova-R.pdf` 也是"抽出去因为脚本判定'.tex 源不存在'"（实际 `ls files/psy-stat-I/` 没有 `anova-R.tex` 但有整目录只读存档定位）——待你按 6-29 P2#2 建议改：把 `if tex.exists(): continue` 改成同时检测 ①`fp.with_suffix(".tex")`、②`<dir>/<stem>_*.tex` glob、③`<repo>/<files-dir>/<topic>/source/**/<stem>*.tex` glob 与 `**/*-<stem-tail>*.tex` glob。属审计脚本启发式增强、风险极低、纯减小 false-positive 抽签池。

4. **`_notes/tutoring/` 10 篇里 7 篇缺 `summary` 字段**（承接 6-30，今日核对未变）—— `_notes/tutoring/` 下 10 篇辅导讲义（多数 PDF-only、45-50 行）里 `exam-timing.md` / `math-thinking.md` / `probability.md` / `quadratic-inequality.md` / `solid-geometry.md` / `space-vectors.md` / `sphere.md` 都缺 `summary`，只有 `math.md` / `physics.md` / `physics-basic-models.md` 三篇写了（今日抽检 10/10 命中 `physics-basic-models.md`，summary L42 「初升高/高一物理常见基本模型整理，含受力分析、运动学、牛顿定律、斜面与连接体等典型套路。」写得得当）。7 篇缺 summary 属老文盘扫待办——属内容写作判断（站主了解课程内容、写一句更准），不擅改。

5. **`_notes/life/paid-test-us-visa-types.md` 缺 `summary` 字段且无法直接改**（承接 6-30）—— 这份文件是 `scripts/paywall/build_paid.py` 从 gitignored 的 `_paid/liuxue-test-visa.md` 自动生成的免费预览（文件首行注释「⚠ 本文件由 scripts/paywall/build_paid.py 从 _paid/liuxue-test-visa.md 自动生成…请勿手改这里」）。**真修复路径**是改源文件 `_paid/liuxue-test-visa.md` front-matter 加 summary，再重跑 paywall 脚本；或改脚本默认从源拷贝。**属脚本逻辑 + 内容写作判断**。

6. **`_notes/study/mao-thought/mao-thought-principles.md` 无 `summary:` 字段但正文 L17 是介绍段落**（承接 6-29 / 6-30，**今日纠正性质**）—— 该文件正文 L17 「本文是笔者备考 2023 年春季《毛泽东思想和中国特色社会主义理论体系概论》期末时，对着课本逐章整理出的全部知识点梳理…」实际上是一段自足的介绍文，PDF-only 页面有正文时 `post.html` 的自动导语兜底不触发，**渲染上不缺**；只是 front-matter 里少了那个结构化 `summary:` 字段，其它索引（如 `search.json` 的 summary 字段）会 fall back。改否属写作偏好——统一到 front-matter `summary:` 更规范，但保留正文引言段也合理。**列入 P2 供参考、不擅改**。

7. **`_notes/study/corp-fin/mid-2018.md` 缺 summary 已为误报**（**今日纠正**，昨日 P2#13 错误承接）—— 今日核对 L6 `summary:` 字段实际写满（「公司财务管理 2018 年期中试卷原题…Coke 教授班用卷。」），`git log` 显示自 6-19 首次 commit 起即含 summary，昨日抽检 3/10 判定"缺 summary"系误判。**从待办移除**。

8. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接自 6-03。功能正确，纯排版风格小差异，可忽略。

9. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接自 6-03（`mid-2015` 不存在于 `_notes/study/psy-stat-I/`，历史 P2 项应指其它文件，需站主核对）。今日抽检 4/10 命中 `anova-R.pdf` (314.3 KB)——`grep -rl "anova-R.pdf" _notes/` 只命中 `_notes/research/r-data-processing.md` 与 `_notes/study/psy-stat-I/anova-R.md` 两处引用（前者是 R 教程系列的自动侧栏、后者是 pdf 主 note），有基础互链，只是缺手写互链段落引导。属内容写作决策。

10. **掼蛋 6-18 ~ 6-24 期间联机改造 + 6-30 掼蛋牌面迁移四象限版型（`916d716`）待真机 / 微信内置浏览器跑两局完整联机回归**（承接 6-27 ~ 6-30 + **今日 `916d716` 新增**）—— 今日 `916d716` 把掼蛋牌面从旧五点式版型改成 **四象限版型 + 矢量花色 SVG + 横竖双构图**（`assets/js/doudizhu/ui.js` +127/-45 行、`toolbox/doudizhu/index.html` +170/-142 行，共 2 文件 +297/-187 行），美术线大改；建议真机联机回归时加一项"新四象限版型跨端视觉一致性"——iPhone Safari / Android Chrome / 桌面 Chrome / iPad 直式/横屏至少 4 组合过一遍出牌桌面。沙箱无浏览器 / 无音频出口无法替代真机回归。

11. **宠物中心 6-28 共 9 commit（v2026.06.24-A → v2026.06.28f）三端 UX 大改 + 数据备份 + 身份 token + 共享同步加固待多浏览器 / 多设备验收**（承接 6-29 / 6-30）—— 三件大事：① **数据备份导出/恢复 + 存储满真提示回滚 + 删除权限前端收口**（`5696bec`）；② **身份 token 前端接入 + 加入通知/换码清退**（`dbba468`）；③ **三端设计打磨**（`b15db52` / `e84fd3f`）—— 建议 iPhone Safari + Android Chrome + 桌面 Chrome + 桌面 Firefox + PWA standalone 至少五组合下过 board 一遍。沙箱无 GUI / 无真触屏，跑不了。

12. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 承接自 6-18 ~ 6-30。属内容修复决策。

13. **`_flight-staging/` 5 个设计稿页面属尚未上线的机票工具设计版**（**今日新观察**）—— `7a5702e` 已做发布前巡查（10 维度多 agent + 对抗复核 103 条发现）零风险修复，页面本身状态健康；`_-`前缀 + 今日新加 `exclude:` 双保险确保不进站，仓库内保留作为「先补后端再发可用工具」路线的稳定设计工作副本，符合站里"半成品用内容 / 功能开关挡，不用长命分支挡"的分支与部署模型（CLAUDE.md）。**尚待站主决定**：机票捡漏功能何时把 5 个设计稿 → 真正搬到 `/toolbox/flight/` 上线、后端订阅 / 邮件推送 / 报价 API 何时接入。属产品排期决策。

14. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 ~ 6-30，今日**周三未跑** `dead_links.py`，本条仅承接周一审计结论）—— `centretax.net` / `offcampus.psu.edu` / `www.hwdrivingschool.com` / `www.judicialinformation.com` / `www.textile-outlook.com`。

15. **`dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间字符串误判为外链**（沿用 6-08 ~ 6-30）—— audit 脚本 cosmetic；非阻塞。

### 🗂 仓库卫生

**结构较昨日有 1 处新增改动**——`_flight-staging/` 目录昨日 `7a5702e` 新增（5 个 HTML 设计稿：config-onepage.html 720 行 / email-digest.html 164 行 / handoff.html 134 行 / manual.html 206 行 / ticket-detail.html 280 行；共 1504 行、5 文件）。今日已 audit 通过——① **敏感信息扫描** `grep -nE "psu\.edu|周睿|ruizhou|@gmail|@qq|127\.0\.0\.1"` 全部命中都是**设计稿站长注脚 / 品牌页脚 / 占位符**（`config-onepage.html` L210 "周睿的百宝箱 · 机票捡漏" / `email-digest.html` L18 L132 同 kicker / `handoff.html` L92 `curl -fsSL https://ruizhou03.com/flight/get`、`manual.html` L121 同 URL 与 L135 `you@gmail.com` 占位符 — 全部为设计稿必需的品牌 / 占位显示，非泄露），无真实私钥 / 令牌 / 凭证；② **密钥字符串扫描** `grep -nEi "password|secret|token|api[-_]key|key[-_]hash"` 仅命中 `manual.html` L165「应用专用密码 / App passwords」（该行是 Gmail 应用密码功能说明文本、非泄露值），OK；③ **上线验证**——今日增加了 `exclude: - _flight-staging/`，二次 build 后 `_site/` 顶层结构仍是 25 项，无任何 flight 相关目录 / 文件出现，双保险成立（`_-`前缀 Jekyll 默认排除 + `_config.yml` 显式排除）；④ **本机 workspace 卫生**——`git status` clean（除今日 `_config.yml` 一处改动之外）、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、副本文件 `find . -name "* 2.*"` 全空，无编辑器 / 系统垃圾、无 LaTeX 中间产物泄露、无 `_paid/` 泄露；⑤ **`.gitignore` 状态未变**——`_paid/*` / `EMAIL_SUMMARY.md` / `_site/` / `.jekyll-cache/` 等全部约定条目在位。**结论**：新增 `_flight-staging/` 归属清晰、隔离到位、内容干净、双保险已生效，不需要额外结构调整；仓库其它区域与 6-30 完全一致，无可优化空间。

### 🔬 抽检专项

**抽检 1/10 · `game` · `toolbox/leap/index.html`**（1123 行 / 40.1 KB inline ·「跳过 Deadline」拖拽越过 deadline 的心理小游戏 · 无独立 .js / .css）
- 已修复：无。
- 一致性 ✅：layout=default / title「跳过 Deadline \| Rui Zhou」/ permalink=/toolbox/leap/。**已正确接入 games-shell 三件套**：`identity.js` / `leaderboard.js` / `comments.js`（`grep` 均命中），适配站点排行榜 / 评论体系；`@media (hover: hover)` 守卫 1 处（覆盖 `.overlay-btn:hover` L125），触屏无 hover 卡态。
- 代码质量 ✅：1123 行 > 1000 行软阈值但不显著，单文件 inline 三件套（HTML/CSS/JS）合仓——站里"游戏页 inline 全套"的既有做法，未违反约定；未见明显魔法数、事件监听清理正常。
- UI / 视觉 ✅：文件规模、结构、`games-shell` 接入均合规。视觉最终需真机走 golden path（开始 / 拖拽 / 越过 deadline / 胜负 / 再来一局），沙箱无浏览器无法直接验证——但未见静态代码问题。
- 长期建议：无——已是站内游戏页标准结构。

**抽检 2/10 · `pdf_archive` · `files/corp-fin/mid-2018.pdf`**（110.7 KB · 光华公司财务管理 2018 期中试卷 PDF）
- 已修复：无。
- 归属 ✅：`grep -rl "mid-2018.pdf\|corp-fin/mid-2018"` 仅命中 `_notes/study/corp-fin/mid-2018.md`（sub_category=公司财务管理）一处引用，非孤儿；同 course 下另有 mid-2017/2020/2021 期中真题、final-2020/2021/2022 期末真题、cheat-sheet-mid/final-2022、mid-sample-1 与 mid-sample-1-sol 共 10 篇 PDF 存档构成公司财务管理真题系列。
- 体积合理性：110.7 KB << 5 MB；非孤儿、非候选 pdfslim 对象。
- LaTeX 化状态：③ **维持 PDF 存档即可**——历年真题存档定位明确、扫描 / 手写为主的原题一次性资料，LaTeX 化收益低。
- **纠正**：昨日 6-30 P2#13"抽检 3/10 · mid-2018.md 缺 summary"为误报——今日核对 mid-2018.md L6 实际已有 summary 字段（"公司财务管理 2018 年期中试卷原题…Coke 教授班用卷。"，`git log` 显示自 6-19 首次 commit 时即含），从待办移除。

**抽检 3/10 · `lecture_note_pdf_only` · `_notes/study/corp-fin/mid-sample-1.md`**（17 行 / 1.0 KB · 公司财务管理期中样卷 1 试题 PDF-only）
- 已修复：无。
- 一致性 ✅：`pdf_url: /files/corp-fin/mid-sample-1.pdf` 路径有效（体积 51.3 KB）；front-matter 完整（layout=post / main_category=学习资料 / sub_category=公司财务管理 / course=公司财务管理 / material_type=Exams / date=2022-09-01 / author=Zircon / permalink / **有 `summary` 字段且写满**：「光华本科《公司财务管理》期中样卷 1 题面 PDF。配套答案见 mid-sample-1-sol.md；可掐时做完后对照。」/ keywords ×24 覆盖「公司财务期中样卷 1 试题」/「corp fin midterm sample 1」/「WACC 计算」/「NPV 题目」/「CAPM 题目」/「MM 定理 题」/「PKU corp fin midterm」等核心搜索词）。
- 同 sub_category 互链 ✅：公司财务管理 sub_category 下 10 篇（0 P2#13 的 mid-2018.md 已归入公司财务管理系列）自动侧栏覆盖；summary 明确点出配套答案 `mid-sample-1-sol.md`，手写互链引导到位。
- LaTeX 化建议：③ **维持 PDF 存档即可**——样卷 / 一次性应试材料，md 正文按 MAINTENANCE.md 密度建议留空、front-matter + summary 兜底，符合"期末样卷 / 一次性应试材料 = front-matter only"梯度。
- 长期建议：无。

**抽检 4/10 · `pdf_archive` · `files/psy-stat-I/anova-R.pdf`**（314.3 KB · 心理统计 I R 教程 ANOVA 章节）
- 已修复：无。
- 归属 ✅：`grep -rl "anova-R.pdf"` 命中 2 处引用——① `_notes/study/psy-stat-I/anova-R.md`（sub_category=心理统计Ⅰ、pdf_url 主 note）② `_notes/research/r-data-processing.md`（sub_category=R 教程、R 教程系列自动侧栏文章）。前者是主 note、后者是 R 教程串读侧栏；有基础互链，只是缺手写互链段落引导（已归入 P2#9 老待办）。
- 体积合理性：314.3 KB << 5 MB；非孤儿、非候选 pdfslim 对象。
- **`.tex 源`探测启发式漏判**（承接 P2#3）——`ls files/psy-stat-I/` 仅 7 个 PDF（anova-R.pdf / cheat-sheet-final-2022.pdf / cheat-sheet-mid-2022.pdf / demo-summary.pdf / final-2022.pdf / hw-summary.pdf / mid-2022.pdf），无 `.tex` 源、也无 `source/` 子目录，是真 PDF-only 存档，spotcheck 的"抽出因缺 tex 源"启发式对这份没有实质意义（既不能催 LaTeX 化，也不代表异常）。
- LaTeX 化建议：③ **维持 PDF 存档即可**——R 教程章节 PDF、rendered 自 R Markdown 或 knitr 报表，原始 `.Rmd` / notebook 未入仓，LaTeX 化收益低。
- 长期建议：无。

**抽检 5/10 · `pdf_archive` · `files/r-tutorials/r-multiple-linear-regression.pdf`**（510.4 KB · R 教程系列多元线性回归章节）
- 已修复：无。
- 归属 ✅：`grep -rl "r-multiple-linear-regression"` 命中 2 处——① `_notes/research/r-multiple-linear-regression.md`（sub_category=R 教程、主 note、有 summary 字段）② `_notes/research/r-psy-stats-ii.md`（R 教程串读侧栏 / 引用）。
- 体积合理性：510.4 KB << 5 MB；非孤儿。
- **`.tex 源`探测启发式漏判同 4/10**——`ls files/r-tutorials/` 有 7 个 R 章节 PDF + 一个 `source/` 子目录（存在 R Markdown 源）；虽然 `source/` 里的 `.Rmd` 不是 `.tex`，但脚本判定"tex 不存在"的启发式对 R 生态确无意义。
- LaTeX 化建议：③ **维持 PDF 存档即可**——R 系列 rendered 章节 PDF，源在 `source/` 里以 R Markdown 形态存在（非 `.tex`），可编辑性已保留。
- 长期建议：无。

**抽检 6/10 · `lecture_note_pdf_only` · `_notes/study/corp-fin/final-2021.md`**（17 行 / 1.2 KB · 公司财务管理期末试题 2021 PDF-only）
- 已修复：无。
- 一致性 ✅：`pdf_url: /files/corp-fin/final-2021.pdf` 路径有效；front-matter 完整（layout=post / main_category=学习资料 / sub_category=公司财务管理 / course=公司财务管理 / material_type=Exams / date=2021-09-01 / author=Zircon / permalink / **有 `summary` 字段且写满**：「光华本科《公司财务管理》2021 年期末真题 PDF。考点覆盖期权定价、资本预算、股利政策、并购估值等期末高频题型；可与历届期末真题对照练习。」/ keywords ×25 覆盖「公司财务期末 2021」/「corp fin final 2021」/「WACC 期末 计算题」/「NPV IRR 期末 题目」/「资本结构 期末」/「期权定价 期末」等核心搜索词）。
- 同 sub_category 互链 ✅：与 mid-sample-1 同——公司财务管理系列 10 篇自动侧栏覆盖。
- LaTeX 化建议：③ **维持 PDF 存档即可**——期末真题原题存档、一次性应试材料。
- 长期建议：无。

**抽检 7/10 · `note` · `_notes/life/subway-construction-methods.md`**（231 行 / 17.6 KB · 生活攻略 / 生活之问 · 现在的地铁是怎么修出来的？大部分施工怎么从地面上看不到？）
- 已修复：无。
- **内容正确性** ✅：通读全文——从"问题 / 结论先行 / 科学原理（明挖法 vs 盾构法 vs 新奥法 vs 顶管沉管特殊法）/ 场景表 / 中国盾构机制造发展"六段布局，事实描述准确（盾构机直径 6-7 m、日推 5-15 m、隧道深度 15-30 m、中国盾构机全球占 70%、能造 18 m 级超大盾构等均可核，行业公认数据）。
- **结构与可读性** ✅：五段问答结构（问题→结论先行→原理→场景→中国国情）符合"生活之问"专栏调性；标题层级清晰（h1 六段主标 + h2 分节 + h3 子节，最深 3 级）；开篇「地铁站是看得见的工地，地铁线是看不见的工程」抓人；结尾中国国情段闭环。
- **搜索可发现性** ✅：keywords ×25 覆盖「地铁怎么施工」/「明挖法」/「盾构法」/「TBM tunnel boring machine」/「新奥法」/「顶管法」/「沉管法」/「盾构机」/「管片 预制混凝土」/「城市基础设施 施工」等口语词、专业词、英文缩写、常识误区词，符合 SKILL.md 覆盖建议。
- **图文与配文** ✅：全文仅 L117 一处 `<p class="img-caption">` 配文（描述盾构机工作原理），无外链图片、疑似为 inline SVG 图示；配文文字达意（124 字），无 markdown 残留。
- **排版与样式** ✅：中英文空格规范（"盾构机 TBM"）、无中文斜体、无裸 URL；`---` 分割段落规范。
- **专栏一致性** ✅（"生活之问"）：问答式开篇 + 五段结构 + 中国国情收束，符合专栏调性。
- 长期建议：无——文章质量高、结构完整，是"生活之问"专栏典型样本。

**抽检 8/10 · `pdf_archive` · `files/linear-algebra/linear-algebra-strang.pdf`**（894.1 KB · 6-24 首上 Strang 教法英文线性代数讲义）
- 已修复：无。
- 归属 ✅：`grep -rl "linear-algebra-strang"` 仅命中 `_notes/study/linear-algebra/linear-algebra-strang.md`（主 note，有 summary 字段）；`ls files/linear-algebra/` 显示同目录另有 `source-strang/` 子目录（LaTeX 源已入仓）。
- 体积合理性：894.1 KB << 5 MB；非孤儿。
- **`.tex 源`**：**有**（`source-strang/` 目录内），但 spotcheck 只查 `linear-algebra-strang.tex` 同基名同路径，漏判——归 P2#3 承接。
- LaTeX 化状态：**已 LaTeX 化**，`source-strang/` 目录持源；本 PDF 是 rendered 产物。
- landing 渲染问题：见 P1#2——`study_order` 未列 `linear-algebra`，`/notes/index.html` 数学组渲染不出该文件。
- summary 引用问题：见 P2#1——summary 末句提到「本站中文《线性代数讲义》」但仓库不存在。
- 长期建议：等中文姊妹版决定后修 summary 文案。

**抽检 9/10 · `game` · `toolbox/citation/index.html`**（839 行 / 31.2 KB inline ·「BibTeX 引用格式转换器」单人 utility · 无独立 .js / .css）
- 已修复：无。
- 一致性 ✅：layout=default / title「BibTeX 引用格式转换器 \| Rui Zhou」/ permalink=/toolbox/citation/。**未接 games-shell**（`grep` 未命中 identity/leaderboard/comments/qrcode）——但该"游戏"实质是**单人 utility（BibTeX ↔ AMA/APA/MLA/Chicago 等引用格式转换）**而非对战游戏，不需要排行榜 / 评论 / 催更，**不接入合理**（类似 random / converter / time 等工具类）。
- 代码质量 ✅：839 行 << 1000 行软阈值；`@media (hover: hover)` 守卫 6 处齐整（触屏无 hover 卡态）。
- UI / 视觉 ✅：`ct-wrap max-width 880px` + `layout-2col grid 1fr 1fr` + 窄屏 `760px` 断点回退单列——响应式合规；配色全走站点 token（`var(--color-ink)` / `var(--color-light)`）。
- 长期建议：无——utility 类工具，架构合理、IA 健康、调性符合站点。

**抽检 10/10 · `note` · `_notes/tutoring/physics-basic-models.md`**（49 行 / 1.2 KB · 学习辅导资料 / 物理 · 高一物理基本模型 PDF-only）
- 已修复：无。
- 一致性 ✅：`pdf_url: /files/tutoring/physics-basic-models/Main.pdf` 路径有效；front-matter 完整（layout=post / main_category=学习资料 / sub_category=物理 / course=物理 / material_type=Notes / date=2026-01-24 / discipline=初升高 / permalink / redirect_from=/notes/pre-high-school/... / **有 `summary` 字段且写得当**：「初升高/高一物理常见基本模型整理，含受力分析、运动学、牛顿定律、斜面与连接体等典型套路。」/ keywords ×30 覆盖「高一物理基本模型」/「高中物理模型」/「high school physics models」/「斜面模型」/「传送带模型」/「板块模型」/「弹簧模型」/「圆周运动模型」/「连接体问题」/「初升高 物理衔接」/「子弹打木块 模型」/「人船模型」等核心搜索词、专业词、英文、场景词齐全）。
- 同 sub_category 互链 ⚠️（承接 P2#4 老待办）：`_notes/tutoring/` 10 篇中该文件写了 summary，是"辅导 tutoring" 目录中已写 summary 的 3 篇之一；其余 7 篇（exam-timing / math-thinking / probability / quadratic-inequality / solid-geometry / space-vectors / sphere）缺 summary，归 P2#4 老待办。
- LaTeX 化建议：③ **维持 PDF 存档即可**（物理基本模型 PDF-only 存档、非常青文档、初升高衔接一次性资料）。
- 长期建议：无——本文自身健康，只是同 sub_category 老待办随抽检暴露。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点本次 `backend_pulse.py` 仍全报 HTTP 403（curl 56 CONNECT tunnel failed）。承接 5-27 ~ 6-30 沙箱无 fly.io 出口，不阻塞巡检、未主动重启 fly app。**今日 6 个 commit 分布**：`111a30d` 是昨日巡检产物（DAILY_REVIEW.md）无内容 / 后端影响；`916d716` 掼蛋牌面美术改动（前端 UI 2 文件）无后端依赖；`5e222cd` / `b2da4c6` / `a132bf3` 是管理后台隐藏操作（3 篇 `_notes/life/` 生活攻略）无后端调用改动；`7a5702e` 机票捡漏设计稿物化（`_flight-staging/` 5 文件）—— 机票工具后端未实现（本条已归 P2#13 待你决定何时补），当前只是设计版入仓，无实际后端调用改动。

---

## 2026-06-30

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项；今日周二 DOW=2，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=30，未跑 monthly_stats）。距 6-29 巡检共 **0 个 commit**（HEAD 仍是 `baa12e4`，即昨日自动巡检 commit；自昨日 24:00 后无新提交，工作树纯净）。`bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（6.934 s，cold build）。今日 `scripts/audit/run.sh` 全套审计 **13/13 每日项跑完**——`keywords_coverage`（散文 121 篇全部充足，与 6-27 / 6-28 / 6-29 完全一致）/ `images`（仅 `files/interm-macro/interm-macro-2022-zh.pdf` 2.13 MB 大文件，承接 6-16 ~ 6-29，markdown 入口正常）/ `material_type_enum`（**分布完全无变化**：Notes ×46 / Exams ×40 / 课程测评 ×18 / 经验之谈 ×5 / 错题本 ×3 / 写作 ×2 / 口语 ×1 / 词汇 ×1，承接 6-27 ~ 6-29）/ `filename_convention` / `hover_no_media` / `sibling_crosslink`（10 个 ≥3 篇 sub_category 组全互链）/ `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检见下）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-29）—— 这 12 项全 clean。**仅 `bare_dollar` 报 1 条命中**：`_notes/study/adv-micro-psu/adv-micro-psu-2026.md`（body L91 = 文件 L106）的「正是 `$1-F(x)$` 这个概率质量」—— 这其实是**完整配对的 KaTeX 数学公式**（同句已有 `$\frac{1-F(x)}{f(x)}$` / `$x$` ×5 / `$1-F(x)$` / `$f(x)$` / `$(1-F)/f$` 等多组正确 `$...$` 配对，本句最末「自然出现。」前所有 `$` 偶数配齐），脚本误报源于其启发式只识别 `$\d+/\d+$`（数学分数）跳过，而 `$\d+-...` 形式没纳入跳过条件 —— 与昨日 6-29 修复的「`\$1-F(x)$`」是完全不同的两个位置：昨日是真错位（开头 `$` 被转义），今日 L106 这条是 6-29 修复后**正常**的 `$1-F(x)$` 配对，脚本启发式漏判而已。**不是文章问题**，列入 P2 审计脚本启发式增强。**今日 0 项自动修复**——审计仅一条命中且为脚本误报、所有内容审计全 clean、距上次巡检零新增 commit、抽检 10 项无新增内容问题。**P1 队列**：承接昨日两条 `study_order` 缺项——①承接 13 日的 `interm-econometrics`（**第 18 日承接**）、②承接 1 日的 `linear-algebra`（**第 7 日承接**），核对 `comm -23` 差集仍是这两条；都属 IA 设计判断、不擅改。**P2 新发现**：抽检 7/10 `_notes/tutoring/probability.md` 缺 `summary`，全目录扫描发现 `_notes/tutoring/` 10 篇里有 **7 篇**（exam-timing / math-thinking / probability / quadratic-inequality / solid-geometry / space-vectors / sphere）缺 summary——同 pattern 老文盘扫待办（与历史 P2 老文 `corp-fin/mid-2018.md` / `mao-thought-principles.md` 同类）；抽检 9/10 `_notes/life/paid-test-us-visa-types.md` 也缺 summary，但该文件是 `scripts/paywall/build_paid.py` 从 gitignored 的 `_paid/liuxue-test-visa.md` 自动生成，**不能直接改**（会被脚本下次重生覆盖）—— 需改源文件或脚本，列入 P2。

### ✅ 本次已自动修复

无。今日审计仅一条命中且为 `bare_dollar.py` 启发式误报（`$1-F(x)$` 是完整 KaTeX 数学配对），属脚本启发式漏判而非文章问题；其它 12 项审计全 clean，距上次巡检零新增 commit，没有可修复的「小而无争议」改动。

### 📋 待你把关

#### P0（紧急）
无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 ~ 6-29，**第 18 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、120 页 Wooldridge 体系教科书式英文讲义、94 keywords 厚足覆盖）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 仍 25 个目录、`study_order` 仍 23 条，`comm -23` 差集仍是 `interm-econometrics`、`linear-algebra` 两条，承接昨日不变。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）属设计判断，仍请你拍板。

2. **`_config.yml` 的 `study_order` 仍未列 `linear-algebra` 文件夹**（承接 6-24 ~ 6-29，**第 7 日承接**）—— `dfbb84c` 6-24 新建的 `_notes/study/linear-algebra/linear-algebra-strang.md` 因 `study_order` 没列 `linear-algebra`，**在 `/notes/index.html` 数学组里渲染不出来**（sitemap / search.json / `_site/notes/linear-algebra/linear-algebra-strang.html` 都正常输出，仅 landing 缺）。`_config.yml` 中数学组当前只有 `real-anal` 一条；自然位置是放在 `real-anal` 之前（线性代数比实分析更基础）。**但放在何处属顺序判断，且未来可能还会加中文版**（详见 P2#1），故仍写进待办由你拍板。

#### P2（建议）

1. **`linear-algebra-strang.md` 的 summary 引用「本站中文《线性代数讲义》」但仓库内仍不存在**（承接 6-24 ~ 6-29）—— `grep "course.*线性代数" _notes/study/` 仍只命中 strang 这一篇，未发现中文姊妹版。summary 最后一句「这是本站中文《线性代数讲义》之外，按 Strang 教法重构的英文姊妹篇」会让读者点过去找不到中文版。两种可能：① 中文版还在 LaTeX 化排队待上线 → 等中文版落地再放出；② 临时占位文案 → 删去「之外，按 Strang 教法重构的英文姊妹篇」这句、改成自足介绍。**属内容写作判断、请你拍板**。

2. **`scripts/audit/bare_dollar.py` 启发式漏判 `$\d+-...$` 类数学配对**（今日**新发现**）—— 今日唯一一条 audit 命中即为该漏判：`_notes/study/adv-micro-psu/adv-micro-psu-2026.md` L106「正是 `$1-F(x)$` 这个概率质量」。脚本流程：见到 `$1`（数字），消费 `1` 后下一字符是 `-`（不在「`$\^_{}`」跳过集，也不是 `\d+/\d+` 分数 fallback 集），于是认作裸金额。但 `$1-F(x)$` 是平衡的 KaTeX 数学公式（开头 `$` 后续紧跟字面数学表达，而非货币 amount）。**建议修复**：把 L114-130 那段「数字后跟 `-`」也纳入跳过条件——具体可以是「`$\d+...` 后续若在同段同行内能找到下一个未转义 `$`、且 `$...$` 内容含字母 / `(` / `\\` 等数学token 而非纯逗号-小数点-空格-单位词」，则视为公式跳过。属审计脚本启发式增强、风险极低、纯减小 false-positive 命中——但仍是脚本逻辑改动，**自评不属"小而无争议"范畴，列入待办由你拍板**。

3. **`scripts/audit/spotcheck.py` 的 `.tex 源` 探测启发式仍漏判带主题后缀和异目录情形**（承接 6-27 / 6-28 / 6-29）—— L185 `fp.with_suffix(".tex")` 只查同路径同基名 `.tex`。今日抽检 5/10 `files/adv-macro-psu/chapters/ch6.pdf` 又一次给出实证（`ls files/adv-macro-psu/chapters/` 实存 `ch6_neoclassical.tex`，spotcheck 报「.tex 源 不存在」），与 6-27 ~ 6-29 同类。其它 3 项 pdf_archive 抽检里（`files/adv-micro-pku/chapters/ch1.pdf` 80.4 KB / `files/psy-stat-I/demo-summary.pdf` 938.2 KB）确为真 PDF-only（核对：`ls files/adv-micro-pku/chapters/` 仅 ch1.pdf…ch6.pdf 无任何 `.tex` 源；`ls files/psy-stat-I/` 仅 7 个 PDF 无 source/ 子目录），不再加例。**建议修复同 6-29 P2#2**：把 `if tex.exists(): continue` 改成同时检测 ①`fp.with_suffix(".tex")`、②`<dir>/<stem>_*.tex` glob、③`<repo>/<files-dir>/<topic>/source/**/<stem>*.tex` glob 与 `**/*-<stem-tail>*.tex` glob。属审计脚本启发式增强、风险极低、纯减小 false-positive 抽签池——但仍是脚本逻辑改动，**自评不属"小而无争议"范畴，列入待办由你拍板**。

4. **`_notes/tutoring/` 10 篇里 7 篇缺 `summary` 字段**（今日**新发现**，抽检 7/10 触发全目录扫描）—— `_notes/tutoring/` 下 10 篇辅导讲义（多数 PDF-only、45-50 行）里 `exam-timing.md` / `math-thinking.md` / `probability.md` / `quadratic-inequality.md` / `solid-geometry.md` / `space-vectors.md` / `sphere.md` 都缺 `summary`，只有 `math.md` / `physics.md` / `physics-basic-models.md` 三篇写了。这与历史 P2 老文 `corp-fin/mid-2018.md` / `mao-thought-principles.md` 同 pattern。今日抽检 7/10 命中 `probability.md`（front-matter 完整 layout=post / main_category=学习资料 / sub_category=数学 / course=数学 / discipline=初升高 / material_type=Notes / date=2026-01-20 / keywords ×29 充足覆盖核心搜索词「古典概型」/「几何概型」/「条件概率」/「等可能概型」/「树状图 列表法」等，**但缺 `summary`**）。归并入老文盘扫待办——属内容写作判断（站主了解课程内容、写一句更准），不擅改。

5. **`_notes/life/paid-test-us-visa-types.md` 缺 `summary` 字段且无法直接改**（今日**新发现**，抽检 9/10）—— 这份文件是 `scripts/paywall/build_paid.py` 从 gitignored 的 `_paid/liuxue-test-visa.md` 自动生成的免费预览（文件首行注释「⚠ 本文件由 scripts/paywall/build_paid.py 从 _paid/liuxue-test-visa.md 自动生成…请勿手改这里」）。front-matter 含 paid=false / paid_slug=liuxue-test-visa / price=6 / column=liuxue / column_price=39 / member_price=15 / keywords ×28 充足覆盖「美国签证」/「F-1」/「F-2」/「J-1」/「OPT」/「STEM OPT」/「CPT」/「H-1B」/「O-1」/「L-1」/「TN」/「EB-2」/「EB-3」/「绿卡」/「身份转换」等核心搜索词，**但缺 `summary`**（`scripts/paywall/build_paid.py` 自动脚本未拷贝 summary 到生成产物，或源文件未写）。直接改自动生成的 `.md` 文件会被脚本下次重生覆盖；**真修复路径**是改源文件 `_paid/liuxue-test-visa.md` front-matter 加 summary，再重跑 paywall 脚本；或改脚本默认从源拷贝。**属脚本逻辑 + 内容写作判断**，写进待办由你拍板。

6. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接自 6-03。功能正确，纯排版风格小差异，可忽略。

7. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接自 6-03。已有「同课程自动侧栏」覆盖（`sibling_crosslink.py` ✅）但缺手写互链段落引导。属内容写作决策。

8. **掼蛋 6-18 ~ 6-24 期间联机改造 + 调试链路收尾共 23 个 commit 待真机/微信内置浏览器跑两局完整联机回归** —— 承接 6-27 ~ 6-29 P2#5/#6。重点回归：① 联机终局对方看到最后一手桌面（`0fcd7ed` mp19）；② 调试台 4-Tab + 字体放大 + 融合 test/quad（`97d9c72`）；③ Web Audio 合成音效（`7d9197a`）。沙箱无浏览器/音频出口无法替代真机回归。

9. **宠物中心 6-28 共 9 commit（v2026.06.24-A → v2026.06.28f）三端 UX 大改 + 数据备份 + 身份 token + 共享同步加固待多浏览器/多设备验收** —— 承接 6-29 P2#7。三件大事：① **数据备份导出/恢复 + 存储满真提示回滚 + 删除权限前端收口**（`5696bec`）；② **身份 token 前端接入 + 加入通知/换码清退**（`dbba468`）；③ **三端设计打磨**（`b15db52` / `e84fd3f`）—— 手机正文宽度 / auto-fit 卡 / 圆角阴影体系 / 弹窗关闭键 / PWA standalone 顶栏 / 猫语面板视觉并入主面板，建议在 iPhone Safari + Android Chrome + 桌面 Chrome + 桌面 Firefox + 加装到主屏（PWA standalone）至少五个组合下，过一遍 board。沙箱无 GUI / 无真触屏，确确实实跑不了。

10. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 6-17 `008ff4f` 落地 74 首安全改善后剩余的「英文歌 / 翻唱抓错 CD / ASR 漂移」等问题首站主可继续推进。属内容修复决策（承接自 6-18 ~ 6-29）。

11. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 ~ 6-29，今日**周二未跑** `dead_links.py`，本条仅承接周一审计结论）—— `centretax.net` / `offcampus.psu.edu` / `www.hwdrivingschool.com` / `www.judicialinformation.com` / `www.textile-outlook.com`。

12. **`dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间字符串误判为外链**（沿用 6-08 ~ 6-29）—— audit 脚本 cosmetic（6-10 已有 SKIP_URL_PATTERNS 但仍偶发命中）；非阻塞。

13. **抽检 3/10 · `_notes/study/corp-fin/mid-2018.md` 缺 `summary` 字段**（承接 6-28 / 6-29）—— 与本次 P2#4 `tutoring/` 7 篇 / P2#5 `paid-test-us-visa-types.md` 同 pattern；老文盘扫待办，日后补 summary 时一并涵盖。

14. **抽检 3/10 · `_notes/study/mao-thought/mao-thought-principles.md` 缺 `summary` 字段**（承接 6-29）—— 同上 pattern；老文盘扫待办。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化**——距上次巡检 0 个新 commit、`git status` clean、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、副本文件（`find . -name "* 2.*"`）全空 / 无密钥 / 凭证 / 个人路径痕迹。`_config.yml` 的 `exclude:` 列表已含 `DAILY_REVIEW.md`、`EMAIL_SUMMARY.md`、`SPOTCHECK_*`、`TOOLBOX_AUDIT_REPORT.md`、`docs/`、`scripts/`、`tools/`、`_paid/`、`audio/`、`backends/`、`.claude/`、`.githooks/` 等所有内部目录与产物，状态与昨日完全一致。`.gitignore` 状态未变。**结论**：与 6-15 ~ 6-29 同——仓库目录基线稳定，无可优化空间，跳过结构调整。

### 🔬 抽检专项

**抽检 1/10 · `game` · `toolbox/time/index.html`**（503 行 / 17.5 KB inline ·「时间工具」时区/倒计时/秒表工具 · 无独立 .js / .css）
- 已修复：无。
- 一致性 ✅：layout=default / title「时间工具 \| Rui Zhou」/ permalink=/toolbox/time/。**未接 `games-shell`**（无 identity.js / leaderboard.js / comments.js / qrcode.js 等引用）——但该「游戏」实质是**单人 utility（时区换算 / 倒计时 / 秒表）**而非对战游戏，不需要排行榜 / 评论 / 催更，**不接入合理**，类似 random / converter 等工具类。
- 代码质量 ✅：503 行 << 1000 行软阈值；`@media (hover: hover)` 守卫（L26-28）已正确应用；`.tab-bar button.active` 用 `var(--color-accent)` 主题 token，深色模式自动适配。
- UI / 视觉 ✅：圆角 14px 与 pet board 一致、按钮 padding 0.5rem 1.2rem、tab-bar 用 999px 胶囊形态、配色全走站点 token；`tz-block + tz-block` 用 dashed 分隔线、克制典雅。
- 长期建议：无——utility 类工具，架构合理、IA 健康、调性符合站点。

**抽检 2/10 · `pdf_archive` · `files/adv-micro-pku/chapters/ch1.pdf`**（80.4 KB · 北大高微 Choice Theory 章节）
- 已修复：无。
- 归属 ✅：被 `index.html` L601「Ch 1: Choice Theory」入口引用 `<a href="/files/adv-micro-pku/chapters/ch1.pdf">`；同目录 ch1.pdf…ch6.pdf 6 个章节碎片共同构成北大高微 PKU 章节书目，整书入口在 `_notes/study/adv-micro-pku/adv-micro-pku-2023.md`。
- 体积合理性：80.4 KB << 5 MB；非孤儿、非候选 imgslim/pdfslim 对象。
- LaTeX 化状态：✅ **真 PDF-only 存档**（核对：`ls files/adv-micro-pku/chapters/` 仅 ch1.pdf…ch6.pdf 6 个，**无 source/ 子目录、无任何 `.tex` 源**，与 P2#3 spotcheck 启发式漏判不同——这是真无源文件）。北大高微 PKU 2023 章节笔记原始 .tex 不在本仓库，章节 PDF 作为只读引用维持现状即可。
- 长期建议：无。

**抽检 3/10 · `lecture_note_pdf_only` · `_notes/study/china-hist/china-hist-2024.md`**（17 行 / 1.3 KB · 2024 北大通识「中国古代文化」课堂笔记 PDF-only 存档）
- 已修复：无。
- 一致性 ✅：`pdf_url: "/files/china-hist/china-hist-2024.pdf"` 路径有效；front-matter 完整（layout=post / main_category=学习资料 / sub_category=中国古代文化 / course=中国古代文化 / material_type=Notes / date=2024-09-01 / author=Zircon / discipline=通识 / permalink=/notes/china-hist/china-hist-2024 / **有 `summary` 字段且写满**：「北大通识课《中国古代文化》课堂笔记，按朝代和文化主题（思想、制度、文学、礼乐）梳理脉络。适合通识课学生备考或对中华传统文化感兴趣的读者按图索骥。」/ keywords ×26 厚足覆盖「中国古代文化 课程笔记」/「China ancient culture notes」/「中国古代史 笔记」/「PKU 中国古代文化」/「中国古代 思想史 / 制度史」/「诸子百家」/「儒释道」/「宋明理学」/「中国古代 礼乐」/「科举制度」/「中国古代 文学」/「中国古代 文化常识」等核心搜索词）。
- 同 sub_category 互链 ✅：china-hist 是独子（同 sub_category 仅此一篇），无需互链；自动侧栏可选呈现「同 discipline=通识」分组。
- LaTeX 化建议：③ **维持 PDF 存档即可**——通识选修课一次性课堂笔记、无更新需求、原始排版手写式较多、LaTeX 化收益低。
- 长期建议：无。

**抽检 4/10 · `lecture_note_pdf_only` · `_notes/study/interm-econometrics/interm-econometrics-2023.md`**（16 行 / 3.8 KB · 2023 春光华金融经济方向「中级计量经济学」120 页 Wooldridge 体系教科书式英文讲义 PDF-only）
- 已修复：无。
- 一致性 ✅：`pdf_url: "/files/interm-econometrics/interm-econometrics-2023.pdf"` 路径有效；front-matter 完整（layout=post / main_category=学习资料 / sub_category=中级计量经济学 / course=中级计量经济学 / material_type=Notes / date=2023-09-01 / author=Rui Zhou / discipline=经济学 / permalink=/notes/interm-econometrics/interm-econometrics-2023 / **有 `summary` 字段且写满**：「光华金融经济方向《中级计量经济学》（2023 春，宋晓军）整学期课堂笔记，重写并统一为一本自足的英文教科书式讲义（120 页，教科书彩色盒子排版，定义/定理/假设/例子分色）。以 Wooldridge 体系为脉络，从简单回归与 OLS 讲起，依次覆盖多元回归的估计（遗漏变量偏误为核心）、推断（t/F 检验与经典线性模型）、大样本渐进理论；再逐一放松假设——函数形式与拟合优度、虚拟变量与 Chow 检验、异方差（稳健标准误 / BP / White / WLS / FGLS）、设定与数据问题（RESET / 代理变量 / 测量误差 / 缺失数据 / LAD）、面板数据（DiD / 一阶差分 / 固定效应 / 随机效应 / CRE）、工具变量与 2SLS（弱工具、内生性检验、过度识别）。可对照 Wooldridge 教材自学或期末复习时通读。」/ keywords ×94 厚足覆盖「中级计量经济学」/「Intermediate Econometrics」/「Wooldridge」/「OLS」/「Gauss-Markov BLUE」/「OVB」/「multicollinearity VIF」/「Chow test」/「LPM」/「heteroskedasticity」/「robust standard error」/「White Eicker Huber」/「Breusch-Pagan」/「WLS / FGLS」/「RESET」/「proxy variable」/「measurement error attenuation bias」/「DiD」/「parallel trends」/「first difference」/「fixed effects」/「random effects」/「CRE Mundlak」/「Hausman」/「IV」/「2SLS」/「weak instrument」/「exclusion restriction」/「Sargan」/「Wu-Hausman」/「宋晓军」/「光华」/「PKU econometrics」等核心搜索词）。
- **`/notes/` landing 渲染不出来**——`_config.yml` 的 `study_order` 未列 `interm-econometrics` 文件夹（承接 P1#1，**第 18 日承接**）。sitemap / search.json / `_site/notes/interm-econometrics/interm-econometrics-2023.html` 都正常输出，仅 landing 缺。
- LaTeX 化建议：② **加入低优队列**——120 页教科书式英文讲义、若日后还要做迭代更新或被其他课程交叉引用、LaTeX 化收益高；但作者已毕业、迭代需求低、当前 PDF 排版完整可读，归低优。
- 长期建议：解决 P1#1 study_order 缺项，让本篇能从 landing 渲染。

**抽检 5/10 · `pdf_archive` · `files/adv-macro-psu/chapters/ch6.pdf`**（232.2 KB · PSU 高级宏观 Neoclassical Growth Model 章节碎片）
- 已修复：无。
- 归属 ✅：被 `index.html` L639「Ch 6: The Neoclassical Growth Model」入口引用 `<a href="/files/adv-macro-psu/chapters/ch6.pdf">`；同目录 ch1.pdf…ch12.pdf + 多份 `chN_<topic>.tex` 源文件共同构成 PSU 高宏 12 章章节书目，整书入口在 `_notes/study/adv-macro-psu/`。
- 体积合理性：232.2 KB << 5 MB；非孤儿。
- LaTeX 化状态：✅ **已 LaTeX 化**（核对：同目录实存 `ch6_neoclassical.tex` 源文件）—— 与昨日 `ch8.pdf`/`ch8_rbc.tex` 同模式（**主题后缀**：同目录、不同基名 `chN_<topic>.tex`），**与 6-27 ~ 6-29 spotcheck 启发式漏判 P2#3 完全一致**——`spotcheck.py` 因 L185 `fp.with_suffix(".tex")` 只查同基名，没识别 `ch6_neoclassical.tex` 是 `ch6.pdf` 的源；今日再次实证。
- 长期建议：解决 P2#3 `spotcheck.py` 启发式增强，从此不会再误抽该类已 LaTeX 化对象。

**抽检 6/10 · `lecture_note_pdf_only` · `_notes/study/corp-fin/mid-sample-1.md`**（17 行 / 1.0 KB · 2022 光华本科「公司财务管理」期中样卷 1 题面 PDF-only）
- 已修复：无。
- 一致性 ✅：`pdf_url: "/files/corp-fin/mid-sample-1.pdf"` 路径有效；front-matter 完整（layout=post / main_category=学习资料 / sub_category=公司财务管理 / course=公司财务管理 / material_type=Exams / date=2022-09-01 / author=Zircon / discipline=管理学 / permalink=/notes/corp-fin/mid-sample-1 / **有 `summary` 字段且写满**：「光华本科《公司财务管理》期中样卷 1 题面 PDF。配套答案见 mid-sample-1-sol.md；可掐时做完后对照。」/ keywords ×24 厚足覆盖「公司财务期中样卷 1」/「corp fin midterm sample 1」/「WACC」/「NPV」/「IRR」/「CAPM」/「资本结构」/「MM 定理」/「贝塔」/「股利政策」/「敏感性分析」/「光华 公司财务」/「PKU corp fin midterm」等核心搜索词）。串读链路：summary 末尾「配套答案见 mid-sample-1-sol.md」明确指引到答案版，符合"练题—对答案"的引导动线。
- 同 sub_category 互链 ✅：`公司财务管理` 课程下 3+ 篇（mid-sample-1 / mid-sample-1-sol / mid-2018 等）自动侧栏互链。
- LaTeX 化建议：③ **维持 PDF 存档即可**——一次性本科课程样卷题面 PDF、22 年至今无更新、LaTeX 化收益极低。
- 长期建议：无。

**抽检 7/10 · `note`（辅导讲义 · 概率必修二）· `_notes/tutoring/probability.md`**（47 行 / 1.1 KB · 2026-01-20 PDF-only 初升高数学辅导讲义）
- 已修复：无。
- front-matter 部分完整：layout=post / main_category=学习资料 / sub_category=数学 / course=数学 / discipline=初升高 / material_type=Notes / date=2026-01-20 / permalink=/notes/tutoring/probability / pdf_url=/files/tutoring/probability/Main.pdf / published=true / redirect_from=/notes/pre-high-school/probability（保留旧 URL 重定向 ✅）/ keywords ×29 厚足覆盖「初升高数学 概率」/「高中必修二 概率」/「概率初步」/「高一概率」/「junior high to senior high probability」/「中考后衔接 数学」/「古典概型」/「几何概型」/「条件概率 高中」/「独立事件 互斥事件」/「排列组合 概率」/「随机事件 概率」/「样本空间 事件」/「频率与概率」/「概率加法公式」/「概率乘法公式」/「等可能概型」/「概率 树状图」/「概率 列表法」等核心搜索词。
- **缺 `summary` 字段**（与 `_notes/tutoring/` 同目录 7 篇老文同 pattern，全目录扫描见 P2#4：exam-timing / math-thinking / probability / quadratic-inequality / solid-geometry / space-vectors / sphere 都缺；只有 math / physics / physics-basic-models 三篇写了）。归并入老文盘扫待办（P2#4），属内容写作判断（站主了解学生年龄段、教材版本、用什么风格写一句更准），不擅改。
- 同 sub_category 互链 ✅：tutoring 数学组多篇（math / math-thinking / exam-timing / quadratic-inequality / probability / solid-geometry / space-vectors / sphere）自动侧栏互链。
- LaTeX 化建议：③ **维持 PDF 存档即可**——辅导期间一次性产出、PDF 排版含手写公式 / 图示、LaTeX 化收益低。
- 长期建议：补 P2#4 summary 后整目录抽签池更健康。

**抽检 8/10 · `pdf_archive` · `files/psy-stat-I/demo-summary.pdf`**（938.2 KB · 2022 PKU 心理统计Ⅰ课堂 R/SPSS 代码 demo 整理）
- 已修复：无。
- 归属 ✅：被 `_notes/study/psy-stat-I/demo-summary.md` 唯一引用 `pdf_url: "/files/psy-stat-I/demo-summary.pdf"`，路径有效。
- 体积合理性：938.2 KB < 5 MB（接近但仍在阈值下）；非孤儿、非候选 imgslim/pdfslim 对象——内含代码截图 / R 输出截图，已合理压缩。
- LaTeX 化状态：✅ **真 PDF-only 存档**（核对：`ls files/psy-stat-I/` 仅 7 个 PDF：anova-R / cheat-sheet-final-2022 / cheat-sheet-mid-2022 / demo-summary / final-2022 / hw-summary / mid-2022，**无 source/ 子目录、无任何 `.tex` 源**）。课堂 R/SPSS 代码截图汇编、原始材料是截图非可编辑代码、维持 PDF 存档合理。
- markdown 入口 front-matter ✅：psy-stat-I/demo-summary.md **有 `summary` 字段且写满**：「心理统计Ⅰ课堂 R/SPSS 代码 demo 整理。把一学期讲过的 z/t 检验、方差分析、相关、回归、卡方等常用过程代码集中成查找手册，期末复习和后续作业上机时可直接抄改。」/ keywords ×27 充足。
- 长期建议：无。

**抽检 9/10 · `note`（生活攻略 · 美国签证完全指南付费）· `_notes/life/paid-test-us-visa-types.md`**（407 行 / 25.0 KB · 2026-03-18 付费文章免费预览，paywall 自动生成产物）
- 已修复：无。
- 文件首行注释明确：「⚠ 本文件由 scripts/paywall/build_paid.py 从 _paid/liuxue-test-visa.md 自动生成：只含免费预览，锁定正文在后端。请勿手改这里，改源文件后重跑脚本。」——**不能直接改**。
- front-matter 部分完整：layout=post / title=「美国签证完全指南：从 F-1 到绿卡，每种身份能做什么、不能做什么（付费）」/ main_category=生活攻略 / sub_category=留学攻略 / date=2026-03-18 / author=周睿 / permalink=/life/paid-test/us-visa-types / published=true / keywords ×28 厚足覆盖「美国签证」/「F-1」/「F-2」/「J-1」/「J-2」/「OPT」/「STEM OPT」/「CPT」/「H-1B」/「O-1」/「L-1」/「TN 签证」/「绿卡」/「EB-2」/「EB-3」/「身份转换」/「签证能做什么」等核心搜索词；paid=false / paid_slug=liuxue-test-visa / price=6 / column=liuxue / column_price=39 / member_price=15 / afdian_url 等付费墙字段齐全。
- **缺 `summary` 字段**——脚本 `scripts/paywall/build_paid.py` 没有从源文件 `_paid/liuxue-test-visa.md` 拷 summary，或源文件未写 summary。归 P2#5 待办，需改源文件 + 重跑脚本，或改脚本默认从源拷贝。
- 图文 ✅：1 处 `<p class="img-caption">`，SVG 流程图「中国学生赴美：从 F-1 到绿卡的三条主流路径」清晰；svg 内仅英文 + 数字 + 短中文标签，无中文斜体。
- 排版 ✅：开篇用「这是给谁看」+ 警示框「签证规则会频繁变动…复杂个案请咨询移民律师，本文不构成法律建议」声明 + 全景 SVG 图三个 hook，调性循证、严谨、为读者负责。
- 长期建议：解决 P2#5 让 summary 进自动生成产物。

**抽检 10/10 · `game` · `toolbox/sudoku/index.html`**（1177 行 / 42.3 KB inline ·「数独」单人解谜小游戏 · 无独立 .js / .css）
- 已修复：无。
- 一致性 ✅：layout=default / title「数独 \| Rui Zhou」/ permalink=/toolbox/sudoku/。**已接入 `games-shell`** 全套：games-shell.css（L7）+ identity.js / leaderboard.js / comments.js / nick-prompt.js / save-state.js / settlement.js 六组件（L379-384）；L809「games-shell 接入」段对接逻辑；适合单人解谜 + 「最快通关时间」排行榜场景。
- 代码质量：1177 行略超 1000 行拆分软阈值但属可接受范围（数独引擎 + 难度生成 + UI + 排行榜接入 + 评论自洽，强行拆分反而 IA 散）；`@media (hover: hover)` 守卫（L87）已正确应用，触屏设备不会卡 hover 态。
- UI / 视觉 ✅：`.sudoku-rank-row` 圆角 10px / `var(--color-bg-warm)` 暖底、`var(--color-border)` 边、`var(--color-ink)` 文字，全走站点 token；max-width 480px 适配手机竖屏。
- 联机/排行榜 ✅：通过 `games-shell` 全套接入（排行榜 + 评论 + 催更）；属典型单人解谜 + 全榜 leaderboard 场景，适配恰当。
- 长期建议：无——游戏架构合理、IA 健康、调性符合站点高端典雅。

---

## 2026-06-29

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（16 项；今日周一 DOW=1，跑了 dead_links / orphan_files / pii_scan 三项周一项；DOM=29，未跑 monthly_stats）。距 6-28 巡检共 **9 个 commit**（`9f69751` → `e84fd3f`），全部是宠物中心一条线的 UX 打磨与功能加固，承接昨日 P2#6「待多浏览器/多设备验收」的同一作者持续推进：① `09f9b08` + `45a8603`「v2026.06.24 版本信标双子」——先加可见标 `2026.06.24-A`、再撤页头药丸改页脚低调灰字（避免吵正文）；② `7a1e38f` + `07d55e2`「6-28 巡查组 autofix」——共享同步防丢条 / 活动流持久化 / 成员辨识度 + 后续 XSS / 辨识度 / 同步合并 / 逻辑 / 三端打磨；③ `5696bec` + `dbba468` + `a95883a` + `b15db52` + `e84fd3f`「6-28 b/c/d/e/f 五连递增 patch」——数据备份导出/恢复 + 存储满真提示回滚 + 删除权限前端收口 / 身份 token 前端接入 + 家人动态含自己 + 通知文案软化 + 加入通知/换码清退 / 修通知箱标题重复 + 统一三端折叠断点 + iPad 防缩放 / 三端设计打磨（手机正文宽度 / auto-fit 卡 / 圆角阴影体系 / 弹窗关闭键）/ 猫语面板并入主面板视觉 + PWA standalone 专属顶栏。9 个 commit 全部聚焦 `_includes/toolbox/pet/` + `_includes/cat-soundboard.html` + `assets/css/pet.css` + `assets/js/pet.js` 四套文件、不溢出。`bundle install` ✅ + `bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` ✅ 通过、零 warning、零 error（cold build 13.114 s）。今日 `scripts/audit/run.sh` 全套审计 **13/13 每日项全 clean + 3/3 周一项跑完**——`keywords_coverage`（散文 121 篇全部充足，承接 6-27 / 6-28）/ `images`（仅 `files/interm-macro/interm-macro-2022-zh.pdf` 2.13 MB 大文件，承接 6-16 ~ 6-28，markdown 入口正常）/ `material_type_enum`（**分布完全无变化**：Notes ×46 / Exams ×40 / 课程测评 ×18 / 经验之谈 ×5 / 错题本 ×3 / 写作 ×2 / 口语 ×1 / 词汇 ×1，承接 6-28）/ `filename_convention` / `hover_no_media`（pet 大改后所有 `:hover` 仍齐用 `@media (hover: hover)` 守卫）/ `sibling_crosslink`（10 个 ≥3 篇 sub_category 组全互链）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检见下）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-28）/ `dead_links`（260 条与上周一同源：wechat 403 ×几十条 + 几十条 DNS NameResolutionError 长链 + 5 条已知失活外链 + jsdelivr / fonts.googleapis 等 CDN 沙箱不可达）/ `orphan_files`（0 孤儿）/ `pii_scan`（18 篇含 PII，分布同上周一，无新增）。**今日 3 项自动修复**——巡读 `_notes/` 全文时发现 3 处 `\$<math>$` 转义错位（半个 `\$` 转义掉，后面 `$` 开了未配对的数学环境，致 KaTeX 渲染断裂）：① `_notes/life/fresh-vs-frozen-fish.md:56`「速率降至 \$1/100$」→「速率降至 $1/100$」（数学分数）/ ② `_notes/life/autorefractor.md:34`「短了 \$1/3$ 米」→「短了 $1/3$ 米」/ ③ `_notes/study/adv-micro-psu/adv-micro-psu-2026.md:106`「正是 \$1-F(x)$ 这个概率质量」→「正是 $1-F(x)$ 这个概率质量」。三处都属同模式打字错误（本想写 `$math$`、误把开头 `$` 转义成 `\$`），上下游同段已用正确 `$...$` 配对，没有歧义；修复后 cold rebuild 仍零 warning / 零 error（4.999 s）。**P1 队列**：承接昨日两条 `study_order` 缺项——①承接 13 日的 `interm-econometrics`（**第 17 日承接**）、②承接 1 日的 `linear-algebra`（**第 6 日承接**），核对 `comm -23` 差集仍是这两条；都属 IA 设计判断、不擅改。

### ✅ 本次已自动修复

1. **`_notes/life/fresh-vs-frozen-fish.md:56`** —「`速率降至 \$1/100$）`」→「`速率降至 $1/100$）`」。原文为 `\$1/100$`：开头 `\$` 被 KaTeX 解析为字面美元符 `$`，剩下 `1/100$` 开了一个**未配对的**数学环境，会污染段落后续直到下一个 `$` 才闭合；前后同段 `$5\text{-}10\%$` / `$10\text{-}15\%$` / `$-18$ ℃` 都是 KaTeX 数学分数 / 区间正确写法，本行作者本想用 `$1/100$` 表「速率降到 1/100」（分数），不是货币。修复后 KaTeX 在 -18 ℃ bullet 处正常渲染分数。
2. **`_notes/life/autorefractor.md:34`** —「`焦距比"刚好落在视网膜上"短了 \$1/3$ 米`」→「`...短了 $1/3$ 米`」。同一模式：本行讲 `-3.00 D` 对应焦距 `1/3 米`（屈光度倒数），是数学分数；同段 `$-3.00$ D` 已用了正确 `$...$` 数学写法，作者本想写 `$1/3$`、误把开头 `$` 转义。修复后段落 KaTeX 正确渲染分数 1/3。
3. **`_notes/study/adv-micro-psu/adv-micro-psu-2026.md:106`** —「`正是 \$1-F(x)$ 这个概率质量`」→「`正是 $1-F(x)$ 这个概率质量`」。Mechanism Design 章节讲 hazard rate `(1-F(x))/f(x)` 的直觉拆解时，同句开头与结尾都用了 `$\frac{1-F(x)}{f(x)}$` / `$f(x)$` / `$(1-F)/f$` 等正确 `$math$` 写法，本行作者本想用 `$1-F(x)$`、误把开头 `$` 转义；句子另一处 `$f(x)$` 表「本地密度」配对正常。修复后段落 KaTeX 正确渲染 `1-F(x)`。

> **判定路径**：`grep -rnE '\\\$[^$]{1,40}\$' _notes/` 扫到约 25 条候选，其中 22 条是 `$\$10K$` 这类正确写法（math 模式里用 `\$` 嵌字面美元符，表「\$10K」金额）—— 排除；剩下 3 条是真错位（math content 1/3 / 1/100 / 1-F(x) 不是货币），统一修复。前后段落上下文一致、零歧义，符合「小而无争议」标准；rebuild 验证零回归。

### 📋 待你把关

#### P0（紧急）
无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 / 6-14 / 6-15 / 6-16 / 6-17 / 6-18 / 6-19 / 6-20 / 6-21 / 6-22 / 6-23 / 6-24 / 6-25 / 6-26 / 6-27 / 6-28，**第 17 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、120 页 Wooldridge 体系教科书式英文讲义）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 仍 25 个目录、`study_order` 仍 23 条，`comm -23` 差集仍是 `interm-econometrics`、`linear-algebra` 两条，承接昨日不变。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）属设计判断，仍请你拍板。

2. **`_config.yml` 的 `study_order` 仍未列 `linear-algebra` 文件夹**（承接 6-24 / 6-25 / 6-26 / 6-27 / 6-28，**第 6 日承接**）—— `dfbb84c` 6-24 新建的 `_notes/study/linear-algebra/linear-algebra-strang.md` 因 `study_order` 没列 `linear-algebra`，**在 `/notes/index.html` 数学组里渲染不出来**（sitemap / search.json / `_site/notes/linear-algebra/linear-algebra-strang.html` 都正常输出，仅 landing 缺）。`_config.yml` 中数学组当前只有 `real-anal` 一条；自然位置是放在 `real-anal` 之前（线性代数比实分析更基础）。**但放在何处属顺序判断，且未来可能还会加中文版**（详见 P2#1），故仍写进待办由你拍板。

#### P2（建议）

1. **`linear-algebra-strang.md` 的 summary 引用「本站中文《线性代数讲义》」但仓库内仍不存在**（承接 6-24 / 6-25 / 6-26 / 6-27 / 6-28）—— `grep "course.*线性代数" _notes/study/` 仍只命中 strang 这一篇，未发现中文姊妹版。summary 最后一句「这是本站中文《线性代数讲义》之外，按 Strang 教法重构的英文姊妹篇」会让读者点过去找不到中文版。两种可能：① 中文版还在 LaTeX 化排队待上线 → 等中文版落地再放出；② 临时占位文案 → 删去「之外，按 Strang 教法重构的英文姊妹篇」这句、改成自足介绍。**属内容写作判断、请你拍板**。
2. **`scripts/audit/spotcheck.py` 的 `.tex 源` 探测启发式漏判带主题后缀和异目录情形**（承接 6-27 / 6-28）—— L185 `fp.with_suffix(".tex")` 只查同路径同基名 `.tex`，无法识别两类常见模式：① **主题后缀**（同目录）`chN.pdf` ↔ `chN_<topic>.tex`（昨日抽检 `files/adv-macro-psu/chapters/ch8.pdf` 实存 `ch8_rbc.tex` 一例为证）；② **异目录**（`files/<topic>/` ↔ `files/<topic>/source/`）（昨日抽检 `files/real-anal/real-anal-ch6-2024.pdf` 实存 `files/real-anal/source/real-anal-ch6-banach-spaces.tex` 一例为证）。今日 4 项 `pdf_archive` 抽检里另 2 项（`files/game-theory/game-theory-mid-2023.pdf` 1.4 MB、`files/adv-micro-pku/chapters/ch6.pdf` 134.8 KB）均确为真 PDF-only（核对：`ls files/game-theory/source/` 不存在；`ls files/adv-micro-pku/chapters/` 仅 ch1.pdf…chN.pdf 无任何 `.tex` 源），不再加例。**建议修复**：把 `if tex.exists(): continue` 改成同时检测 ①`fp.with_suffix(".tex")`、②`<dir>/<stem>_*.tex` glob、③`<repo>/<files-dir>/<topic>/source/**/<stem>*.tex` glob 与 `**/*-<stem-tail>*.tex` glob。属审计脚本启发式增强、风险极低、纯减小 false-positive 抽签池——但仍是脚本逻辑改动，**自评不属"小而无争议"范畴，列入待办由你拍板**。
3. **`_notes/study/mao-thought/mao-thought-principles.md` 缺 `summary` 字段**（今日**新发现**，抽检 6/10）—— 22 行 / 2.4 KB / 正文有一段实质引导（line 17，介绍备考 2023 春毛概期末时对着课本逐章整理出的全部知识点梳理，沿教材主线层层展开）+ 串读引到「期末重点」与「真题回忆版」+ LaTeX 源链接（line 21）。front-matter 完整（layout=post / sub_category=毛泽东思想和中国特色社会主义理论体系概论 / course / material_type=Notes / date=2023-06-15 / discipline=思政 / keywords ×26 充足覆盖核心搜索词），**但无 `summary` 字段**。同 sub_category 三件套的另两篇（`mao-final-highlights-2023.md` / `mao-final-2023-spring.md`）情况待核（未抽中）；本篇正文 / 体例 / 互链都已齐，仅缺 SEO / 列表卡 summary。归并入老文盘扫待办（与昨日 P2#10 `corp-fin/mid-2018.md` 同 pattern）—— 属内容写作判断（站主了解课程内容、写一句更准），不擅改。
4. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接自 6-03。功能正确，纯排版风格小差异，可忽略。
5. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接自 6-03。已有「同课程自动侧栏」覆盖（`sibling_crosslink.py` ✅）但缺手写互链段落引导。属内容写作决策。
6. **掼蛋 6-18 ~ 6-24 期间联机改造 + 调试链路收尾共 23 个 commit 待真机/微信内置浏览器跑两局完整联机回归** —— 承接 6-27 / 6-28 P2#5。重点回归：① 联机终局对方看到最后一手桌面（`0fcd7ed` mp19）；② 调试台 4-Tab + 字体放大 + 融合 test/quad（`97d9c72`）；③ Web Audio 合成音效（`7d9197a`）。沙箱无浏览器/音频出口无法替代真机回归。
7. **宠物中心 6-28 共 9 commit（v2026.06.24-A → v2026.06.28f）三端 UX 大改 + 数据备份 + 身份 token + 共享同步加固待多浏览器/多设备验收** —— 承接 6-27 / 6-28 P2#6 并升级范围。今日新增的 9 commit 集中在三件事：① **数据备份导出/恢复 + 存储满真提示回滚 + 删除权限前端收口**（`5696bec`）—— 站主建议在「设满存储 quota 触发 QuotaExceededError」与「主动删一条体重 / 饮食」两个路径上跑回滚验收；② **身份 token 前端接入 + 加入通知/换码清退**（`dbba468`）—— 多设备 + 多家人时的「邀请码 → token 落本地 → token 失效后清退」是高风险联机链路，需主端 + 副端两台同时跑「邀请 → 加入 → 主端换码 → 副端被清退」整套；③ **三端设计打磨**（`b15db52` / `e84fd3f`）—— 手机正文宽度 / auto-fit 卡 / 圆角阴影体系 / 弹窗关闭键 / PWA standalone 顶栏 / 猫语面板视觉并入主面板，建议站主在 iPhone Safari + Android Chrome + 桌面 Chrome + 桌面 Firefox + 加装到主屏（PWA standalone）至少五个组合下，过一遍 board——加 1 条体重 + 加 1 条饮食 + 触发 mismatch + 切深色 + 切 prefers-reduced-motion + 离线刷新 + 多端共享 + 撤销作差链 + Esc 关弹窗 + 试导出/导入。沙箱无 GUI / 无真触屏，确确实实跑不了。
8. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 6-17 `008ff4f` 落地 74 首安全改善后剩余的「英文歌 / 翻唱抓错 CD / ASR 漂移」等问题首站主可继续推进。属内容修复决策（承接自 6-18 ~ 6-28）。
9. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 / 6-15 / 6-22 / 6-23 / 6-24 / 6-25 / 6-26 / 6-27 / 6-28）—— `centretax.net` / `offcampus.psu.edu` / `www.hwdrivingschool.com` / `www.judicialinformation.com` / `www.textile-outlook.com`。今日周一跑了 `dead_links.py`，本次报 260 条外链疑似死链，多数是沙箱代理 ProxyError（jsdelivr / fonts.googleapis / google CDN / openstreetmap / fly.io 等），不是真死链；wechat 403 一批与 PII 同源（公众号文章链接对未登录爬虫返回 403），不是真死链；上述 5 条 DNS 解析失败属真坏链候选，需站主在生产 / 本机复验。
10. **`dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间字符串误判为外链**（沿用 6-08 / 6-22 / 6-23 / 6-24 / 6-25 / 6-26 / 6-27 / 6-28）—— audit 脚本 cosmetic（6-10 已有 SKIP_URL_PATTERNS 但仍偶发命中）；非阻塞。
11. **抽检 3/10 · `_notes/study/corp-fin/mid-2018.md` 缺 `summary` 字段**（承接 6-28 P2#10）—— 与本次 P2#3 `mao-thought-principles.md` 同 pattern；老文盘扫待办，日后补 summary 时一并涵盖；当下不影响功能。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化**——9 个新 commit 全部聚焦宠物中心（`_includes/toolbox/pet/` + `_includes/cat-soundboard.html` + `assets/css/pet.css` + `assets/js/pet.js` 四套已有文件，无新增目录、无新增文件），未引入新的目录或可疑文件；`git status` clean、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、副本文件（`find . -name "* 2.*"`）全空 / 无密钥 / 凭证 / 个人路径痕迹。`_config.yml` 的 `exclude:` 列表已含 `DAILY_REVIEW.md`、`EMAIL_SUMMARY.md`、`SPOTCHECK_*`、`TOOLBOX_AUDIT_REPORT.md`、`docs/`、`scripts/`、`tools/`、`_paid/`、`audio/`、`backends/`、`.claude/`、`.githooks/` 等所有内部目录与产物，状态与昨日完全一致。`.gitignore` 状态未变。**结论**：与 6-15 ~ 6-28 同——仓库目录基线稳定，无可优化空间，跳过结构调整。

### 🔬 抽检专项

**抽检 1/10 · `game` · `toolbox/dontdoit/index.html`**（1052 行 / 45.2 KB inline ·「不要做挑战 Don't Do It」社交派对小游戏 · 同目录 `cards.json`）
- 已修复：无。
- 一致性 ✅：layout=default / title「不要做挑战 Don't Do It \| Rui Zhou」/ permalink=/toolbox/dontdoit/；正确接入 `assets/css/games-shell.css`（L381）+ `games-shell/identity.js` / `qrcode.js` / `comments.js`（L385-387）；卡牌内容外置 `cards.json` 与 index.html 解耦。1052 行略超 1000 行拆分软阈值但属可接受范围（卡牌渲染 + 抽卡逻辑 + 排行榜联机自洽，强行拆分反而 IA 散）。
- 同目录已含 `cards.json` 内容拆分文件，无独立 .js / .css；调性符合站点高端典雅，dare-header / dare-btn / dare-wrap 命名清晰。
- 联机/排行榜 ✅：通过 `games-shell` 已接入催更 + 评论 + 排行榜；属社交派对游戏适合联机使用。
- 建议：无——架构合理、IA 健康、单文件中等规模可维护。

**抽检 2/10 · `pdf_archive` · `files/game-theory/game-theory-mid-2023.pdf`**（1.4 MB · 2023 博弈论期中真题）
- 已修复：无。
- 归属 ✅：被 `_notes/study/game-theory/game-theory-mid-2023.md` 唯一引用 `pdf_url: "/files/game-theory/game-theory-mid-2023.pdf"`，路径有效。
- 体积合理性：1.4 MB << 5 MB 大文件阈值；非孤儿、非候选 imgslim/pdfslim 对象。
- LaTeX 化状态：✅ **真 PDF-only 存档**（核对：`ls files/game-theory/source/` 不存在；`grep "game-theory.*tex" files/`  零命中）。本科课程一次性期中真题原卷无更新需求，建议**维持现状**。

**抽检 3/10 · `lecture_note_pdf_only` · `_notes/study/real-anal/hw-summary-with-sol.md`**（17 行 / 1.4 KB · 2024 UMich 实分析作业含答案合订本，PDF-only 存档）
- 已修复：无。
- 一致性 ✅：`pdf_url: "/files/real-anal/hw-summary-with-sol.pdf"` 路径有效；front-matter 完整（layout=post / main_category=学习资料 / sub_category=实分析 / course=实分析 / material_type=Notes / date=2024-09-01 / author=Zircon / discipline=数学 / permalink=/notes/real-anal/hw-summary-with-sol / **有 `summary` 字段且写满**：「2024 年在密歇根大学交换时上的实分析课，整学期作业题与我自己的解答合订本。覆盖 Lebesgue 测度、外测度、σ-algebra、Carathéodory 构造、可测函数、Lebesgue 积分、Fatou 引理等核心套路，可对照 Folland 教材自学或卡题时翻看参考解法。」/ keywords ×28 厚足覆盖核心搜索词「实分析 作业 含解答」/「Real Analysis homework with solution」/「UMich 实分析 作业」/「密歇根 实分析 作业」/「Folland 实分析 习题」/「测度论 作业 解答」/「Math 597 习题」等）。
- 同 sub_category 互链 ✅：通过 `sibling_crosslink.py` 与同 `course=实分析` 的其他笔记（`hw-summary-with-sol.md` + `cheat-sheet.md` + `real-anal-2024.md` + chapter notes 等 ≥6 篇）自动侧栏互链。
- LaTeX 化建议：③ 维持 PDF 存档即可——交换学期一次性作业题目 + 自己手写答案，PDF 性价比最高、无更新需求。
- 长期建议：无。

**抽检 4/10 · `pdf_archive` · `files/adv-metrics-psu/midterm-spring-2025-with-solutions.pdf`**（111.2 KB · 2025 春 PSU 高级计量博士课程期中含答案）
- 已修复：无。
- 归属 ✅：被 `_notes/study/adv-metrics-psu/midterm-spring-2025-with-solutions.md` 引用 `pdf_url`；`_notes/study/adv-metrics-psu/midterm-spring-2026.md` 也提到「上届期中含答案」串读链接到 `midterm-spring-2025-with-solutions.pdf` 作参考。
- 体积合理性：111.2 KB << 5 MB；章节合理。
- LaTeX 化状态：✅ **真 PDF-only 存档**（核对：`ls files/adv-metrics-psu/source/` 含 `midterm-spring-2025-with-solutions.tex`、实际 LaTeX 源已有 → 与昨日 spotcheck 启发式漏判 P2#2 同类）—— `files/adv-metrics-psu/source/midterm-spring-2025-with-solutions.tex` 存在但 `spotcheck.py` 因「异目录 + 主题后缀」启发式未识别。**承接 P2#2**。建议**维持现状**。
- 长期建议：无。

**抽检 5/10 · `note`（生活攻略 · 避孕套科普）· `_notes/life/condoms-guide.md`**（369 行 / 27.3 KB · 2026-05-27）
- 已修复：无。
- front-matter ✅：title「避孕套科普：怎么挑、怎么戴、戴和不戴差多少？」/ sub_category=生活之问 / date=2026-05-27 / permalink=/life/condoms-guide / keywords ×44 厚足覆盖核心搜索词（「避孕套科普」/「怎么挑避孕套」/「避孕套尺寸」/「nominal width」/「polyurethane」/「polyisoprene」/「lambskin」/「Sanders 2012 condom errors」/「CAEP 戴套勃起」/「左炔诺孕酮 1.5 mg」/「油基润滑剂 乳胶套」/「WHO 避孕套规范」/「ISO 4074 避孕套标准」等专业循证关键词全部到位）。
- 内容观感 ✅：开篇用「完美使用 vs 典型使用 2% vs 13%」「80% 用户对自己用的尺寸不清楚」「戴套不戴套男女不对称」三组强 hook 进入；调性循证、严谨、说明「这是科普性内容，主要受众是已经有性行为或即将有性行为的成年人」声明；引 Sanders 2012、ISO 4074、WHO 规范等具体文献。
- 图文 ✅：2 处 `<p class="img-caption">`，调性符合「生活之问」专栏。
- 排版 ✅：数学百分比 `2%` / `13%` 直接写，未污染 KaTeX；无中文斜体（验证 `svg_italic_zh` ✅）；`---` 分割线规范。
- 长期建议：无。

**抽检 6/10 · `lecture_note_full` · `_notes/study/mao-thought/mao-thought-principles.md`**（22 行 / 2.4 KB · 2023 春毛概期末知识点梳理 · 51 页 PDF + 引导短文 + LaTeX 源链接）
- 已修复：无。
- 一致性 ✅：layout=post / sub_category=毛泽东思想和中国特色社会主义理论体系概论 / course / material_type=Notes / date=2023-06-15 / discipline=思政 / permalink=/notes/mao-thought/mao-thought-principles / pdf_url=/files/mao-thought/mao-thought-principles.pdf / published=true / keywords ×26 覆盖核心搜索词（「毛泽东思想和中国特色社会主义理论体系概论 知识点梳理」/「毛概 知识点」/「毛中特」/「马克思主义中国化时代化」/「新民主主义革命 三大法宝」/「邓小平理论」/「三个代表」/「科学发展观」/「习近平新时代中国特色社会主义思想」/「Mao Zedong Thought notes」+ 错别字「毛慨」「毛盖」「毛特」+ 期末复习词「毛概 期末 复习提纲」等）。
- 正文 ✅：line 17 一段实质引导（备考 2023 春毛概期末时对着课本逐章整理出的全部知识点梳理，沿教材主线层层展开——从马克思主义中国化时代化的历史进程到习近平新时代中国特色社会主义思想——以多级提纲铺开各章要点，方便对着提纲背诵与回忆）、line 19 串读到「期末重点」与「真题回忆版」两篇 sibling、line 21 LaTeX 源链接。
- 待办：**无 `summary` 字段**（front-matter 列出 keywords 后没接 summary）。同 sub_category 三件套之一却独缺 SEO / 列表卡 summary。归并入 P2 #3 老文盘扫待办（与昨日 corp-fin/mid-2018.md 同 pattern）—— 属内容写作判断、请你拍板。
- LaTeX 化建议：本篇正文是 51 页 PDF + 引导短文混合形态、PDF 本身已带 LaTeX 源（`/files/mao-thought/source/mao-thought-principles.tex`），属于已完成 LaTeX 化状态，无须再加工。
- 长期建议：无。

**抽检 7/10 · `pdf_archive` · `files/adv-micro-pku/chapters/ch6.pdf`**（134.8 KB · PKU 高级微观课本章 6 切片）
- 已修复：无。
- 归属 ✅：被英文学术主页 `index.html` 唯一引用（adv-micro-pku 高级微观 PKU 博士课章节切片之一，与 6-27 抽检 `adv-macro-psu/chapters/ch5.pdf`、6-26 抽检 `adv-micro-psu/chapters/ch7.pdf` 同 pattern）。
- 体积合理性：134.8 KB << 5 MB。
- LaTeX 化状态：✅ **真 PDF-only 存档**（核对：`ls files/adv-micro-pku/chapters/` 全部为 ch1.pdf…chN.pdf，无任何 `.tex` 源；这是 PKU 课程章节切片，与 PSU 课程不同没做 LaTeX 化）。章节切片就是合订本拆页快捷下载入口，章节级 `.tex` 不强求。建议**维持现状**。
- 长期建议：无。

**抽检 8/10 · `note`（生活攻略 · 做菜用油）· `_notes/life/cooking-oils-guide.md`**（307 行 / 20.3 KB · 2026-03-06）
- 已修复：无。
- front-matter ✅：title「做菜用什么油？聊聊常见食用油的烟点和生态位」/ sub_category=生活之问 / extra_categories=[菜谱] / date=2026-03-06 / permalink=/life/cooking-oils-guide / keywords ×22（「做菜用什么油」/「食用油烟点」/「smoke point」/「橄榄油 EVOO」/「精炼 vs 初榨」/「MUFA PUFA」/「丙烯醛 acrolein」/「高温炒菜用什么油」/「油炸用油」等核心搜索词）。
- 内容观感 ✅：循证介绍常见油烟点 + 不饱和脂肪酸 + 家用配置建议；调性符合「生活之问」专栏。
- 图文 ✅：2 处 `<p class="img-caption">`。
- 排版 ✅：数学 / 百分比写法规范、`---` 分割线规范、无中文斜体。
- 长期建议：无。

**抽检 9/10 · `note`（生活攻略 · 鲜鱼 vs 冷冻鱼）· `_notes/life/fresh-vs-frozen-fish.md`**（314 行 / 22.2 KB · 2026-03-09）
- 已修复：line 56 `\$1/100$` → `$1/100$`（同今日自动修复 #1）。
- front-matter ✅：title「鲜鱼 vs 冷冻鱼到底差在哪？」/ sub_category=生活之问 / date=2026-03-09 / permalink=/life/fresh-vs-frozen-fish。
- 内容观感 ✅：开篇用「现杀活鱼 vs 急冻鱼到底差在哪 → K 值 / TVB-N 衰减曲线」做循证 hook；中段对比 0 ℃ / 4 ℃ / 20 ℃ / -18 ℃ / -30 ℃ 五档温度下 K 值变化、配 SVG「三种处理方式下的鱼肉鲜度衰减」图。
- 图文 ✅：2 处 `<p class="img-caption">`（K 值衰减 + 三档解冻方法对比），调性符合「生活之问」。
- 排版：今日修复 1 处 KaTeX 数学转义错位（line 56）；其余 `$5\text{-}10\%$` / `$10\text{-}15\%$` / `$-18$ ℃` / `$60$ ℃` / `$21$ ℃` / `$70$ ℉` 等数学写法规范。
- 长期建议：无。

**抽检 10/10 · `lecture_note_full` · `_notes/study/causal-id/robustness-check.md`**（18 行 / 1.6 KB · 因果识别·稳健性检验 · PDF-only）
- 已修复：无。
- 一致性 ✅：`pdf_url: "/files/causal-id/robustness-check.pdf"` 路径有效；front-matter 完整（layout=post / sub_category=计量因果识别方法 / course / material_type=Notes / date=2023-09-01 / discipline=经济学 / permalink=/notes/causal-id/robustness-check / **有 `summary` 字段**：「因果推断实证审稿中的稳健性检验专题笔记：覆盖 placebo test、parallel trends pre-trend、leave-one-out、bandwidth sensitivity、alternative IV、外推 vs 内推、subsample heterogeneity 等十余种 robustness check 写法；可对照实证论文 5-section 工作流。」/ keywords ×35 充足覆盖中英文 + 教科书别名 + 错别字「稳健性检测」+ PKU 课程别名 + 各 robustness check 写法名）。
- 正文 ✅：line 17 `<p class="img-caption">LaTeX 源码：<a href="/files/causal-id/source/robustness-check.tex">robustness-check.tex</a></p>` 提供源码下载入口；属 `_layouts/post.html` PDF 自动导语承接 + summary 双重背书的健康 PDF-only 形态。
- 同 sub_category 互链 ✅：与同 `course=计量因果识别方法` 的其他笔记自动侧栏互链。
- LaTeX 化建议：✅ **已 LaTeX 化**（同目录 `source/robustness-check.tex` 已有源）；属健康状态。
- 长期建议：无。

---

## 2026-06-28

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项；今日周日 DOW=7，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=28，未跑 monthly_stats）。距 6-27 巡检共 **0 个 commit**（HEAD 仍是 `7206582`，即昨日自动巡检 commit；自昨日 24:00 后无新提交，工作树纯净）。`bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（14.714 s，cold build）。今日 `scripts/audit/run.sh` 全套审计 **13/13 每日项全 clean**——`keywords_coverage`（散文 121 篇全部充足，与 6-27 完全一致）/ `images`（仅 `files/interm-macro/interm-macro-2022-zh.pdf` 2.13 MB 大文件，承接 6-16 中文版讲义首发，markdown 入口正常，与 6-16 ~ 6-27 同；6-24 新增的三份 LaTeX PDF 仍 < 1 MB 阈值下，无新增）/ `material_type_enum`（**分布完全无变化**：Notes ×46 / Exams ×40 / 课程测评 ×18 / 经验之谈 ×5 / 错题本 ×3 / 写作 ×2 / 口语 ×1 / 词汇 ×1，承接 6-27）/ `filename_convention`（6-24 `ACCEPTED_UNDATED` 白名单已加 3 个新讲义合订本，今日 0 命中）/ `hover_no_media`（无新代码改动，clean）/ `sibling_crosslink`（10 个 ≥3 篇 sub_category 组全互链，承接 6-27）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检见下）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-27，沙箱无 fly.io 出口）。**今日 0 项自动修复**——0 个新 commit、所有审计 clean、抽检 10 项无新增问题。**P1 队列**：承接昨日两条 `study_order` 缺项——①承接 13 日的 `interm-econometrics`（**第 16 日承接**）、②承接 1 日的 `linear-algebra`（**第 5 日承接**），核对 `comm -23` 差集仍是这两条；都属 IA 设计判断、不擅改。**P2 新加强**：今日 4 项 `pdf_archive` 抽检中**有 2 项确属 spotcheck 启发式漏判**（`adv-macro-psu/chapters/ch8.pdf` 实存同目录 `ch8_rbc.tex`、`real-anal/real-anal-ch6-2024.pdf` 实存异目录 `files/real-anal/source/real-anal-ch6-banach-spaces.tex`），与昨日新登记的 P2#2 完全一致，进一步加强该项的证据。

### ✅ 本次已自动修复

无。

距上次 review 0 个新 commit，工作树纯净（`git status` clean、`git ls-files --others --exclude-standard` 空），所有 13 项每日审计 clean，抽检 10 项无可自动处理项，**无需任何修复**。今日唯一动作是更新本 DAILY_REVIEW.md 文档。

### 📋 待你把关

#### P0（紧急）
无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 / 6-14 / 6-15 / 6-16 / 6-17 / 6-18 / 6-19 / 6-20 / 6-21 / 6-22 / 6-23 / 6-24 / 6-25 / 6-26 / 6-27，**第 16 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、120 页 Wooldridge 体系教科书式英文讲义，与同 sub_category 的 `interm-metrics/interm-metrics-2023.md` 课程笔记本同名相近但目录不同）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 共 25 个目录、`study_order` 共 23 条，`comm -23` 差集为 `interm-econometrics`、`linear-algebra` 两条，承接昨日不变。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）属设计判断，仍请你拍板。

2. **`_config.yml` 的 `study_order` 仍未列 `linear-algebra` 文件夹**（承接 6-24 / 6-25 / 6-26 / 6-27，**第 5 日承接**）—— `dfbb84c` 6-24 新建的 `_notes/study/linear-algebra/linear-algebra-strang.md` 因 `study_order` 没列 `linear-algebra`，**在 `/notes/index.html` 数学组里渲染不出来**（sitemap / search.json / `_site/notes/linear-algebra/linear-algebra-strang.html` 都正常输出，仅 landing 缺）。`_config.yml` 中数学组当前只有 `real-anal` 一条；自然位置是放在 `real-anal` 之前（线性代数比实分析更基础）。**但放在何处属顺序判断，且未来可能还会加中文版**（详见 P2#1），故仍写进待办由你拍板。

#### P2（建议）

1. **`linear-algebra-strang.md` 的 summary 引用「本站中文《线性代数讲义》」但仓库内仍不存在**（承接 6-24 / 6-25 / 6-26 / 6-27）—— `grep "course.*线性代数" _notes/study/` 仍只命中 strang 这一篇，未发现中文姊妹版。summary 最后一句「这是本站中文《线性代数讲义》之外，按 Strang 教法重构的英文姊妹篇」会让读者点过去找不到中文版。两种可能：① 中文版还在 LaTeX 化排队待上线 → 等中文版落地再放出；② 临时占位文案 → 删去「之外，按 Strang 教法重构的英文姊妹篇」这句、改成自足介绍。**属内容写作判断、请你拍板**。
2. **`scripts/audit/spotcheck.py` 的 `.tex 源` 探测启发式漏判带主题后缀和异目录情形**（承接 6-27，**今日新增 2 例实证**）—— L185 `fp.with_suffix(".tex")` 只查同路径同基名 `.tex`，无法识别两类常见模式：① **主题后缀**（同目录）`chN.pdf` ↔ `chN_<topic>.tex`，今日抽检 2/10 即命中：`files/adv-macro-psu/chapters/ch8.pdf` 实存 `ch8_rbc.tex`（同目录还有 `ch1_complete_markets.tex` / `ch2_exogenous_incomplete.tex` / `ch3_endogenous_incomplete.tex` / `ch4_growth_accounting.tex` / `ch5_solow.tex` / `ch6_neoclassical.tex` / `ch7_neoclassical_vs_data.tex` 等同 pattern ≥8 个）；② **异目录**（`files/<topic>/` ↔ `files/<topic>/source/`），今日抽检 4/10 即命中：`files/real-anal/real-anal-ch6-2024.pdf` 实存 `files/real-anal/source/real-anal-ch6-banach-spaces.tex`（同目录还有 `real-anal-ch1-set-theory.tex` / `real-anal-ch2-measures.tex` / `real-anal-ch3-integration.tex` 等 ≥6 个，命名是「主题描述名」而非「年份名」）。**今日 4 项 `pdf_archive` 抽检中 2 项是同一脚本 false-positive**，比昨日单 1 项更明显；`adv-micro-psu/chapters/ch5.pdf`（抽检 5/10）、`corp-fin/mid-sample-4-sol.pdf`（抽检 8/10）则确为真 PDF-only。**建议修复**：把 `if tex.exists(): continue` 改成同时检测 ①`fp.with_suffix(".tex")`、②`<dir>/<stem>_*.tex` glob、③`<repo>/<files-dir>/<topic>/source/**/<stem>*.tex` glob 与 `**/*-<stem-tail>*.tex` glob。属审计脚本启发式增强、风险极低、纯减小 false-positive 抽签池——但仍是脚本逻辑改动，**自评不属"小而无争议"范畴，列入待办由你拍板**。
3. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接自 6-03。功能正确，纯排版风格小差异，可忽略。
4. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接自 6-03。已有「同课程自动侧栏」覆盖（`sibling_crosslink.py` ✅）但缺手写互链段落引导。属内容写作决策。
5. **掼蛋 6-18 ~ 6-24 期间联机改造 + 调试链路收尾共 23 个 commit 待真机/微信内置浏览器跑两局完整联机回归** —— 承接 6-27 P2#5。重点回归：① 联机终局对方看到最后一手桌面（`0fcd7ed` mp19）；② 调试台 4-Tab + 字体放大 + 融合 test/quad（`97d9c72`）；③ Web Audio 合成音效（`7d9197a`）。沙箱无浏览器/音频出口无法替代真机回归。
6. **宠物中心发布前整改共 4 commit 21 条修复（Quick Wins 14 + P0 7 + 体重模块升级）待多浏览器/多设备验收** —— 承接 6-27 P2#6。建议站主在 iPhone Safari + Android Chrome + 桌面 Chrome + 桌面 Firefox 至少四个组合下，过一遍真宠物中心 board——加 1 条体重 + 加 1 条饮食 + 触发一次 mismatch + 切深色模式 + 切 prefers-reduced-motion + 离线刷新 + 多端共享 + 撤销作差链 + Esc 关闭所有弹窗。沙箱无 GUI / 无真触屏，确确实实跑不了。
7. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 6-17 `008ff4f` 落地 74 首安全改善后剩余的「英文歌 / 翻唱抓错 CD / ASR 漂移」等问题首站主可继续推进。属内容修复决策（承接自 6-18 ~ 6-27）。
8. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 / 6-15 / 6-22 / 6-23 / 6-24 / 6-25 / 6-26 / 6-27）—— `centretax.net` / `offcampus.psu.edu` / `www.hwdrivingschool.com` / `www.judicialinformation.com` / `www.textile-outlook.com`。今日 DOW=7 未跑 `dead_links.py`，明日（周一 6-29 DOW=1）会再次扫到；属沙箱无 DNS 出口的已知现象，需站主在生产 / 本机复验。
9. **`dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间字符串误判为外链**（沿用 6-08 / 6-22 / 6-23 / 6-24 / 6-25 / 6-26 / 6-27）—— audit 脚本 cosmetic（6-10 已有 SKIP_URL_PATTERNS 但仍偶发命中）；非阻塞。
10. **抽检 3/10 · `_notes/study/corp-fin/mid-2018.md` 缺 `summary` 字段**（今日**新发现**）—— 17 行 / 1.3 KB / 正文 0 字 / `pdf_url=/files/corp-fin/mid-2018.pdf`、permalink `/notes/corp-fin/mid-2018`、`pdf_archive` 类型；front-matter 完整（layout=post / sub_category=公司财务管理 / course=公司财务管理 / material_type=Exams / date=2018-09-01 / discipline=管理学 / keywords ×30+，覆盖核心搜索词），但**无 `summary` 字段**。同 corp-fin 目录的 `final-2022.md`（6-27 抽检 2/10）/ `mid-sample-1.md`（6-27 抽检 6/10）/ `mid-sample-4-sol.md`（6-25 抽检 8/10）都有 `summary`，本篇是 corp-fin 系列里少见缺 summary 的 PDF-only 期中真题。归并昨日 P2#10 同类——属老文盘扫待办（与 `tutoring/math-thinking`、`tutoring/sphere` 同 pattern），日后补 summary 时一并涵盖；当下不影响功能。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化**——0 个新 commit、`git status` clean、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、无副本文件（`find . -name "* 2.*"` 全空）/ 密钥 / 凭证 / 个人路径痕迹。6-24 新增的三份 LaTeX 讲义 PDF + source 树（`files/linear-algebra/source-strang/` / `files/mao-thought/source/` / `files/marxism/source/`）已纳入既有 LaTeX source 目录约定（不进 `_config.yml` exclude，要进站让人下载源码），今日无新增。`_config.yml` 的 `exclude:` 列表已含 `DAILY_REVIEW.md`、`EMAIL_SUMMARY.md`、`SPOTCHECK_*`、`TOOLBOX_AUDIT_REPORT.md`、`docs/`、`scripts/`、`tools/`、`_paid/`、`audio/`、`backends/`、`.claude/`、`.githooks/` 等所有内部目录与产物，状态与昨日完全一致。`.gitignore` 状态未变。**结论**：与 6-23 / 6-22 / 6-21 / 6-20 / 6-19 / 6-18 / 6-17 / 6-16 / 6-15 / 6-25 / 6-26 / 6-27 同——仓库目录基线稳定，无可优化空间，跳过结构调整。

### 🔬 抽检专项

**抽检 1/10 · `game` · `toolbox/grouper/index.html`**（531 行 / 20.3 KB inline ·「随机分组器」小工具）
- 已修复：无。
- 一致性 ✅：front-matter 完整（layout=default / title「随机分组器 | Rui Zhou」/ permalink=/toolbox/grouper/）；inline-only 单文件；规模 531 行 << 1000 行拆分阈值；调性符合站点高端典雅风格。
- 功能：把一组人名按可调约束（组数 / 每组人数 / 必须同组 / 必须分开等）随机分组；属纯单人小工具，不需联机/排行榜接入。
- 长期建议：无——规模健康、单一职责、自足可用。

**抽检 2/10 · `pdf_archive` · `files/adv-macro-psu/chapters/ch8.pdf`**（321.0 KB · "Ch 8: RBC"）
- 已修复：无。
- 归属 ✅：被英文学术主页 `index.html` 唯一引用（与 ch5 / ch7 同 pattern，是 adv-macro-psu 高级宏观 PSU 博士课章节切片之一）。
- 体积合理性：321 KB << 5 MB，章节切片合理。
- LaTeX 化状态：⚠️ **实际已 LaTeX 化、但 spotcheck.py 启发式漏判**——同目录存在 `ch8_rbc.tex`（同 dir 主题后缀模式：`ch1_complete_markets.tex` / `ch2_exogenous_incomplete.tex` / `ch3_endogenous_incomplete.tex` / `ch4_growth_accounting.tex` / `ch5_solow.tex` / `ch6_neoclassical.tex` / `ch7_neoclassical_vs_data.tex` / `ch8_rbc.tex` 等 ≥8 个），但 `spotcheck.py` L185 `fp.with_suffix(".tex")` 只查同基名 `ch8.tex` 找不到 → 误把这份 PDF 纳入 pdf_archive 候选池。**承接 P2 #2**。建议**维持现状**——章节合订本 `files/adv-macro-psu/Macro.pdf` 是 LaTeX 化主交付物，章节切片就是合订本拆页快捷下载入口。

**抽检 3/10 · `lecture_note_pdf_only` · `_notes/study/corp-fin/mid-2018.md`**（17 行 / 1.3 KB · 2018 公司财务管理期中真题，PDF-only 存档）
- 已修复：无。
- 一致性 ✅：`pdf_url: "/files/corp-fin/mid-2018.pdf"` 路径有效；front-matter 完整（layout=post / main_category=学习资料 / sub_category=公司财务管理 / course=公司财务管理 / material_type=Exams / date=2018-09-01 / author=Zircon / discipline=管理学 / permalink=/notes/corp-fin/mid-2018 / keywords ×30+ 覆盖核心搜索词「公司财务管理期中 2018」/「corp fin midterm 2018」/「公司财务 期中 真题」/「公司财物」错别字 /「光华 公司财务」/「PKU corp fin midterm」/「资本结构 题目」/「WACC 题目」/「MM 定理」/「NPV」/「IRR」/「DCF」等）。
- 待办：**无 `summary` 字段** + 正文 0 字。与 corp-fin 系列其他抽检过的篇章（`final-2022.md` ✅ / `mid-sample-1.md` ✅ / `mid-sample-4-sol.md` ✅）相比，本篇是少见缺 summary 的 PDF-only 期中真题。归并入 P2 #10。
- LaTeX 化建议：③ 维持 PDF 存档即可——2018 年单次期中真题原卷无更新需求。

**抽检 4/10 · `pdf_archive` · `files/real-anal/real-anal-ch6-2024.pdf`**（123.6 KB · "Real Analysis Ch6 Banach Spaces"）
- 已修复：无。
- 归属 ✅：被 `_notes/study/real-anal/real-anal-ch6-2024.md` 唯一引用 `pdf_url: "/files/real-anal/real-anal-ch6-2024.pdf"`，路径有效（与 6-26 抽检 6/10 的 `real-anal-ch6-2024.md` 入口配套，承接当日抽检结论）。
- 体积合理性：123.6 KB << 5 MB，章节合理。
- LaTeX 化状态：⚠️ **实际已 LaTeX 化、但 spotcheck.py 启发式漏判**——`.tex` 源在异目录 `files/real-anal/source/real-anal-ch6-banach-spaces.tex`（同目录还有 `real-anal-ch1-set-theory.tex` / `real-anal-ch2-measures.tex` / `real-anal-ch3-integration.tex` 等 ≥6 个，命名是「主题描述名」`real-anal-chN-<topic>.tex` 而非 PDF 的「年份名」`real-anal-chN-2024.tex`），属"异目录 + 异基名"双重启发式漏检。**承接 P2 #2**。建议**维持现状**。

**抽检 5/10 · `pdf_archive` · `files/adv-micro-psu/chapters/ch5.pdf`**（251.7 KB）
- 已修复：无。
- 归属 ✅：被英文学术主页 `index.html` 唯一引用（adv-micro-psu 高级微观 PSU 博士课章节切片之一，与 6-27 抽检 8/10 的 `adv-macro-psu/chapters/ch5.pdf`、6-26 抽检 7/10 的 `adv-micro-psu/chapters/ch7.pdf` 同 pattern）。
- 体积合理性：251.7 KB << 5 MB，章节合理。
- LaTeX 化状态：✅ **真 PDF-only 存档**（核对：`ls files/adv-micro-psu/chapters/` 仅 ch1.pdf…ch9.pdf 共 9 个 PDF，无任何 .tex 源；与 6-26 抽检 7/10 结论一致）。章节合订本 `files/adv-micro-psu/adv-micro-psu-lecture-notes.pdf` 是 LaTeX 化主交付物，章节切片就是合订本拆页快捷下载入口，章节级 .tex 源不强求。建议**维持现状**。

**抽检 6/10 · `note`（生活攻略 · 电动 vs 手动牙刷）· `_notes/life/electric-vs-manual-toothbrush.md`**（419 行 / 25.5 KB · 2026-04-02）
- 已修复：无。
- front-matter ✅：title「电动牙刷还是传统牙刷？顺带聊聊洗牙和牙线（无任何品牌赞助）」/ sub_category=生活之问 / date=2026-04-02 / permalink=/life/electric-vs-manual-toothbrush / keywords ×26（「电动牙刷还是传统牙刷」/「electric toothbrush」/「声波牙刷」/「震动牙刷」/「巴氏刷牙法」/「正确刷牙」/「洗牙」/「洁牙」/「牙石」/「牙结石」/「tartar」/「牙菌斑」/「plaque」/「牙线」/「dental floss」/「牙缝变大」/「牙周病」/「periodontitis」/「牙龈炎」/「软毛牙刷」/「洗牙伤牙吗」等核心搜索词）。
- 内容观感 ✅：开篇有「无任何品牌赞助」声明 → 五段式结构（问题 → 结论先行 → 详细分析 → 操作建议 → 常见误区）→ 引 Cochrane 2014 大型综述具体数字（电动 vs 手动减菌斑 21% / 减牙龈炎 11%）+ 临床证据 → 适用人群清单。调性循证、客观、不带货，属「生活之问」典范长文。
- 图文 ✅：2 张配图均有 `<p class="img-caption">`（牙刷类型对比 + 牙石形成过程），caption 含 `<strong>` 标签合规、文字自足。
- 排版 ✅：数学百分比写 `$21\%$` LaTeX、无中文斜体、`---` 分割线规范。

**抽检 7/10 · `note`（生活攻略 · 音感光谱）· `_notes/life/pitch-perception.md`**（323 行 / 24.2 KB · 2026-05-03）
- 已修复：无。
- front-matter ✅：title「为什么有人能记住歌的原调，有人记不住？——音感的光谱」/ sub_category=生活之问 / date=2026-05-03 / permalink=/life/pitch-perception / keywords 覆盖（「音感」/「绝对音感」/「relative pitch」/「absolute pitch」/「perfect pitch」/「quasi-AP」/「音感测试」/「记原调」/「听音感」/「音乐天赋」/「关键期假说」/「critical period」/「AP 训练」/「能不能学会绝对音感」/「色听联觉」/「synesthesia」/「音乐能力 遗传」等核心搜索词）。
- 内容观感 ✅：323 行多章长文，开篇用「敲门声听不出音名」生活化锚点；引入 spectrum 概念（不是 AP / non-AP 二分而是连续谱）；中段引循证文献（关键期假说 / 编码-标签模型 / 关键期窗口 7 岁）+ 配 3 张 img-caption 图（spectrum 示意 + 编码-标签模型 + AP 发展曲线）；末段「成人 AP 训练科学共识普遍悲观」属真诚结论。调性严谨、循证、不夸大，属「生活之问」典范长文。
- 图文 ✅：3 张图全有 `<p class="img-caption">`，caption 文字自足解释图义。
- 排版 ✅：无中文斜体、英文术语夹中文自然加空格、分割线 `---` 规范。

**抽检 8/10 · `pdf_archive` · `files/corp-fin/mid-sample-4-sol.pdf`**（126.1 KB · 公司财务期中样卷 4 答案）
- 已修复：无。
- 归属 ✅：被 `_notes/study/corp-fin/mid-sample-4-sol.md` 唯一引用 `pdf_url: "/files/corp-fin/mid-sample-4-sol.pdf"`，路径有效（与 6-25 抽检 8/10 同份，结论承接：与同目录题面 `mid-sample-4.md` 配套，可掐时做完后对照）。
- 体积合理性：126.1 KB << 5 MB，本科样卷答案合理体量。
- LaTeX 化状态：✅ **真 PDF-only 存档**（本科课程一次性样卷答案 PDF 存档无更新需求）。建议**维持现状**。

**抽检 9/10 · `lecture_note_full` · `_notes/study/monetary-econ/monetary-econ-hw-summary.md`**（19 行 / 1.6 KB · 货币经济学作业整理）
- 已修复：无。
- 一致性 ✅：`pdf_url: "/files/monetary-econ/monetary-econ-hw-summary.pdf"` 路径有效；front-matter 完整（layout=post / main_category=学习资料 / sub_category=货币经济学 / course=货币经济学 / material_type=Notes / date=2023-09-01 / author=Zircon / discipline=经济学 / permalink=/notes/monetary-econ/monetary-econ-hw-summary / keywords ×27 厚足覆盖「货币经济学作业整理」/「货币经济学 习题」/「货币经济学 作业答案」/「Monetary Economics homework」/「贷币 经济学 作业」错别字 /「IS-LM 模型 习题」/「货币需求函数 习题」/「费雪方程 习题」/「泰勒规则 题目」/「Bagehot 法则 习题」/「光华 货币经济学」/「Mishkin 货币金融学 习题」/「Walsh Monetary Theory homework」等核心搜索词）；summary 介绍清晰（「光华金融经济方向《货币经济学》（肖筱林，2023 春）整学期作业的题解整理：覆盖货币需求、IS-LM 与货币传导、央行政策工具、泰勒规则、汇率与利率平价、Bagehot 最后贷款人法则等核心模块。与同学期的课程测评、完整讲义构成三件套」）。
- 关联 ✅：底部 `> 配套阅读：[课程测评] | [完整讲义]` 串读链清晰、同 sub_category 三件套互链完整。
- material_type 备注：本篇属作业题解整理，理论上可归 `Homework`（枚举允许，但当前全站 0 篇用），实际归 `Notes`。属内容形态判断、与既有惯例一致，不擅改。

**抽检 10/10 · `note`（生活攻略 · 衣物洗涤频率）· `_notes/life/laundry-frequency.md`**（404 行 / 17.4 KB · 2026-04-14）
- 已修复：无。
- front-matter ✅：title「不同衣物多久洗一次合理？牛仔裤穿 10 次再洗的传说是真的吗？」/ sub_category=生活之问 / date=2026-04-14 / permalink=/life/laundry-frequency / keywords 覆盖（「衣物多久洗一次」/「牛仔裤 多久洗」/「牛仔裤 不用洗」/「衣物洗涤频率」/「内衣 多久洗」/「袜子 多久洗」/「外套 多久洗」/「西装 多久洗」/「睡衣 多久洗」/「床单 多久换洗」/「枕套 多久洗」/「四件套 多久洗」/「过度清洁 损耗」/「除螨 高温洗」/「dust mite 60 degrees」等核心搜索词）。
- 内容观感 ✅：404 行五段式结构（问题 → 三层分类示意图 → 各类衣物表 → 床品除螨循证 → takeaway），开篇用「牛仔裤穿 10 次再洗」的网传说法做钩子；中段配 2 张 img-caption 图（三层分类示意图 + 60°C 红色虚线除螨曲线）；末段 takeaway「按贴身度分层 + 不要过度清洁」明确。调性循证 + 实用，属「生活之问」典范长文。
- 图文 ✅：2 张图全有 `<p class="img-caption">`，caption 内容自足（「关键的红色虚线是 60 ℃——只有越过这条线才能在 10 分钟内杀死尘螨」属信息密度高的好 caption）。
- 排版 ✅：无中文斜体、`---` 分割线规范、温度数字夹度数符号 `60 ℃` 正常。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点本次 `backend_pulse.py` 仍全报 HTTP 403（curl exit 56，CONNECT tunnel failed）。与 5-27 ~ 6-27 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。**今日 0 个新 commit**，三件套无新增依赖。

---

## 2026-06-27

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项；今日周六 DOW=6，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=27，未跑 monthly_stats）。距 6-26 巡检共 **0 个 commit**（HEAD 仍是 `b0f00df`，即昨日自动巡检 commit；自昨日 24:00 后无新提交，工作树纯净）。`bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（12.218 s，cold build）。今日 `scripts/audit/run.sh` 全套审计 **13/13 每日项全 clean**——`keywords_coverage`（散文 121 篇全部充足，与 6-26 完全一致）/ `images`（仅 `files/interm-macro/interm-macro-2022-zh.pdf` 2.13 MB 大文件，承接 6-16 中文版讲义首发，markdown 入口正常，与 6-16 ~ 6-26 同；6-24 新增的三份 LaTeX PDF 仍 < 1 MB 阈值下，无新增）/ `material_type_enum`（**分布完全无变化**：Notes ×46 / Exams ×40 / 课程测评 ×18 / 经验之谈 ×5 / 错题本 ×3 / 写作 ×2 / 口语 ×1 / 词汇 ×1，承接 6-26）/ `filename_convention`（6-24 `ACCEPTED_UNDATED` 白名单已加 3 个新讲义合订本，今日 0 命中）/ `hover_no_media`（无新代码改动，clean）/ `sibling_crosslink`（10 个 ≥3 篇 sub_category 组全互链，承接 6-26）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检见下）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-26，沙箱无 fly.io 出口）。**今日 0 项自动修复**——0 个新 commit、所有审计 clean、抽检 10 项无新增问题。**P1 队列**：承接昨日两条 `study_order` 缺项——①承接 13 日的 `interm-econometrics`（**第 15 日承接**）、②承接 1 日的 `linear-algebra`（**第 4 日承接**），核对 `comm -23` 差集仍是这两条；都属 IA 设计判断、不擅改。

### ✅ 本次已自动修复

无。

距上次 review 0 个新 commit，工作树纯净（`git status` clean、`git ls-files --others --exclude-standard` 空），所有 13 项每日审计 clean，抽检 10 项无可自动处理项，**无需任何修复**。今日唯一动作是更新本 DAILY_REVIEW.md 文档。

### 📋 待你把关

#### P0（紧急）
无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 / 6-14 / 6-15 / 6-16 / 6-17 / 6-18 / 6-19 / 6-20 / 6-21 / 6-22 / 6-23 / 6-24 / 6-25 / 6-26，**第 15 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、120 页 Wooldridge 体系教科书式英文讲义，与同 sub_category 的 `interm-metrics/interm-metrics-2023.md` 课程笔记本同名相近但目录不同）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 共 25 个目录、`study_order` 共 23 条，`comm -23` 差集为 `interm-econometrics`、`linear-algebra` 两条，承接昨日不变。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）属设计判断，仍请你拍板。

2. **`_config.yml` 的 `study_order` 仍未列 `linear-algebra` 文件夹**（承接 6-24 / 6-25 / 6-26，**第 4 日承接**）—— `dfbb84c` 6-24 新建的 `_notes/study/linear-algebra/linear-algebra-strang.md` 因 `study_order` 没列 `linear-algebra`，**在 `/notes/index.html` 数学组里渲染不出来**（sitemap / search.json / `_site/notes/linear-algebra/linear-algebra-strang.html` 都正常输出，仅 landing 缺）。`_config.yml` 中数学组当前只有 `real-anal` 一条；自然位置是放在 `real-anal` 之前（线性代数比实分析更基础）。**但放在何处属顺序判断，且未来可能还会加中文版**（详见 P2#1），故仍写进待办由你拍板。

#### P2（建议）

1. **`linear-algebra-strang.md` 的 summary 引用「本站中文《线性代数讲义》」但仓库内仍不存在**（承接 6-24 / 6-25 / 6-26）—— `grep "course.*线性代数" _notes/study/` 仍只命中 strang 这一篇，未发现中文姊妹版。summary 最后一句「这是本站中文《线性代数讲义》之外，按 Strang 教法重构的英文姊妹篇」会让读者点过去找不到中文版。两种可能：① 中文版还在 LaTeX 化排队待上线 → 等中文版落地再放出；② 临时占位文案 → 删去「之外，按 Strang 教法重构的英文姊妹篇」这句、改成自足介绍。**属内容写作判断、请你拍板**。
2. **`scripts/audit/spotcheck.py` 的 `.tex 源` 探测启发式漏判带主题后缀和异目录情形**（今日**新发现** P2 项，源自抽检 8/10 复核）—— L185 用 `fp.with_suffix(".tex")` 只查同路径同基名 `.tex`，无法识别两类常见模式：① 主题后缀 `ch5.pdf` ↔ `ch5_solow.tex`（已确认 `files/adv-macro-psu/chapters/ch5_solow.tex`、`ch1_complete_markets.tex` 等 ≥10 处存在）；② 异目录 `chapters/chN.pdf` ↔ `source/chapters/chN_*.tex`（`files/interm-econometrics/source/chapters/ch{1..10}_*.tex`、`files/interm-macro/source/chapters_zh/ch{1..14}_*.tex` 均如此）。**后果**：`adv-macro-psu/chapters/`、`adv-micro-psu/chapters/`、`adv-micro-pku/chapters/`、`interm-econometrics/`、`interm-macro/` 等已 LaTeX 化目录下的章节 PDF 全部仍被 spotcheck 当 "pdf_archive without .tex" 候选纳入抽签池，造成日复一日的 "LaTeX 化潜力" 误判（6-13 / 6-23 / 6-25 daily-review 都已遇到、人肉每次核对一次）。**建议修复**：把 `if tex.exists(): continue` 改成同时检测 ①`fp.with_suffix(".tex")`、②`<dir>/<stem>_*.tex` glob、③`<repo>/<files-dir>/<topic>/source/**/<stem>*.tex` glob。属审计脚本启发式增强、风险极低、纯减小 false-positive 抽签池——但仍是脚本逻辑改动，**自评不属"小而无争议"范畴，列入待办由你拍板**。
3. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接自 6-03。功能正确，纯排版风格小差异，可忽略。
4. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接自 6-03。已有「同课程自动侧栏」覆盖（`sibling_crosslink.py` ✅）但缺手写互链段落引导。属内容写作决策。
5. **掼蛋 6-18 ~ 6-24 期间联机改造 + 调试链路收尾共 23 个 commit 待真机/微信内置浏览器跑两局完整联机回归** —— 承接 6-26 P2#4。重点回归：① 联机终局对方看到最后一手桌面（`0fcd7ed` mp19）；② 调试台 4-Tab + 字体放大 + 融合 test/quad（`97d9c72`）；③ Web Audio 合成音效（`7d9197a`）。沙箱无浏览器/音频出口无法替代真机回归。
6. **宠物中心发布前整改共 4 commit 21 条修复（Quick Wins 14 + P0 7 + 体重模块升级）待多浏览器/多设备验收** —— 承接 6-26 P2#5。建议站主在 iPhone Safari + Android Chrome + 桌面 Chrome + 桌面 Firefox 至少四个组合下，过一遍真宠物中心 board——加 1 条体重 + 加 1 条饮食 + 触发一次 mismatch + 切深色模式 + 切 prefers-reduced-motion + 离线刷新 + 多端共享 + 撤销作差链 + Esc 关闭所有弹窗。沙箱无 GUI / 无真触屏，确确实实跑不了。
7. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 6-17 `008ff4f` 落地 74 首安全改善后剩余的「英文歌 / 翻唱抓错 CD / ASR 漂移」等问题首站主可继续推进。属内容修复决策（承接自 6-18 ~ 6-26）。
8. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 / 6-15 / 6-22 / 6-23 / 6-24 / 6-25 / 6-26）—— `centretax.net` / `offcampus.psu.edu` / `www.hwdrivingschool.com` / `www.judicialinformation.com` / `www.textile-outlook.com`。今日 DOW=6 未跑 `dead_links.py`，下个周一（6-29）会再次扫到；属沙箱无 DNS 出口的已知现象，需站主在生产 / 本机复验。
9. **`dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间字符串误判为外链**（沿用 6-08 / 6-22 / 6-23 / 6-24 / 6-25 / 6-26）—— audit 脚本 cosmetic（6-10 已有 SKIP_URL_PATTERNS 但仍偶发命中）；非阻塞。
10. **抽检 6/10 ~ 6-25 `_notes/tutoring/math-thinking.md` 仅 48 行 / 1.1 KB，但有 `pdf_url`，正文 0 字 + 无 summary**（承接 6-26 P2#9）—— `_notes/tutoring/sphere.md` 同类（PDF-only 教辅讲义）。建议日后老文盘扫一并补 `summary` 字段；当下不影响功能。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化**——0 个新 commit、`git status` clean、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、无副本文件（`find . -name "* 2.*"` 全空）/ 密钥 / 凭证 / 个人路径痕迹。6-24 新增的三份 LaTeX 讲义 PDF + source 树（`files/linear-algebra/source-strang/` / `files/mao-thought/source/` / `files/marxism/source/`）已纳入既有 LaTeX source 目录约定（不进 `_config.yml` exclude，要进站让人下载源码），今日无新增。`_config.yml` 的 `exclude:` 列表已含 `DAILY_REVIEW.md`、`EMAIL_SUMMARY.md`、`SPOTCHECK_*`、`TOOLBOX_AUDIT_REPORT.md`、`docs/`、`scripts/`、`tools/`、`_paid/`、`audio/`、`backends/`、`.claude/`、`.githooks/` 等所有内部目录与产物，状态与昨日完全一致。`.gitignore` 状态未变。**结论**：与 6-23 / 6-22 / 6-21 / 6-20 / 6-19 / 6-18 / 6-17 / 6-16 / 6-15 / 6-25 / 6-26 同——仓库目录基线稳定，无可优化空间，跳过结构调整。

### 🔬 抽检专项

**抽检 1/10 · `game` · `toolbox/ledger/index.html`**（28 行 / 1.1 KB wrapper；同目录 `_includes/toolbox/ledger/board.html` + `modals.html` + 外链 `assets/js/ledger.js` 1270 行 / `ledger-sync.js` 173 行 / `assets/css/ledger.css` 261 行）
- 已修复：无。
- 一致性 ✅：front-matter 完整（layout=default / title「记账 | Rui Zhou」/ permalink=/toolbox/ledger/ / 自定义 `manifest: /toolbox/ledger/manifest.json` + `apple_touch_icon` + `app_title: 记账` + `theme_color: #fafaf9`——独立 PWA 入口，与宠物中心同 pattern）；index.html 28 行极薄 wrapper（link CSS → `<div class="lg-wrap">` 内 include board + modals → 末尾两个外链 script with `?v={{ site.time | date: '%s' }}` 缓存戳）；HTML 注释明示"复刻宠物中心结构，数据只进 localStorage(tool.ledger.v1)、永不上传"、明示「ledger.js 不加 defer 是为依赖 board/modals 元素先就位」——属架构良性约定。
- 长期建议：`assets/js/ledger.js` 1270 行已越 1000 行拆分阈值（与站内 pet.js 同性质，业务逻辑密集型大型 inline 工具），是建设期可接受历史包袱。属架构决策、需站主拍板。

**抽检 2/10 · `pdf_archive` · `files/corp-fin/final-2022.pdf`**（277.1 KB）
- 已修复：无。
- 归属 ✅：被 `_notes/study/corp-fin/final-2022.md` 唯一引用 `pdf_url: "/files/corp-fin/final-2022.pdf"`，路径有效；front-matter 完整（layout=post / sub_category=公司财务管理 / course=公司财务管理 / material_type=Exams / date=2022-09-01 / author=Zircon / discipline=管理学 / permalink=/notes/corp-fin/final-2022 / keywords ×25 覆盖核心搜索词「公司财务管理期末（2022）」/「公司财务 期末 2022」/「corporate finance final 2022」/「公司财物 期末」错别字 /「财务管理 期末真题」/「公司财务 估值题」/「WACC 计算题」/「NPV 计算题」/「MM 定理 题目」/「DCF 题目」/「PKU 公司财务 期末」/「光华 公司财务 期末试卷」等）；summary 介绍清晰（「公司财务管理 2022 年期末试卷原题，覆盖 NPV/IRR 估值、资本结构、WACC 计算等核心题型。建议先合上答案做一遍再对照，备考期中期末或练手都合适。」）。
- 体积合理性：277.1 KB << 5 MB，本科期末试卷切片体量合理；未列入 `EXEMPT_FILES`、`images.py` 未报。
- LaTeX 化潜力：低——本科课程一次性期末真题 PDF 存档无更新需求，建议维持 PDF 存档。

**抽检 3/10 · `lecture_note_pdf_only` · `_notes/study/linear-algebra/linear-algebra-strang.md`**（17 行 / 3.0 KB · 6-24 新建 MIT 18.06 Strang 英文讲义入口）
- 已修复：无。
- 一致性 ✅：`pdf_url: "/files/linear-algebra/linear-algebra-strang.pdf"` 路径有效（133 页 / 894 KB）；front-matter 完整（layout=post / main_category=学习资料 / sub_category=线性代数 / course=线性代数 / material_type=Notes / date=2023-09-01 / author=Rui Zhou / discipline=数学 / permalink=/notes/linear-algebra/linear-algebra-strang / keywords ×60+ 厚足覆盖中英文术语「线性代数 英文讲义」/「linear algebra notes」/「MIT 18.06」/「Gilbert Strang」/「行图 列图」/「row picture column picture」/「A=LU」/「四个基本子空间」/「four fundamental subspaces」/「正交性 投影」/「最小二乘」/「Gram-Schmidt 正交化」/「A=QR」/「行列式」/「特征值 特征向量」/「矩阵对角化」/「Markov 矩阵」/「正定矩阵」/「Jordan 标准型」/「奇异值分解」/「SVD」/「A=U Sigma V transpose」/「Eckart-Young 低秩逼近」/「主成分分析 PCA」/「线性变换 换基」/「伪逆」/「线性代数 期末复习 考研」等核心搜索词）；summary 介绍详尽（约 133 页 + Strang 主线十章 + 彩色盒子排版 + 手绘 TikZ 图 + 直觉先行）。
- **承接 P1 #2 + P2 #1**：① `study_order` 未列 `linear-algebra` 导致 landing 渲染不出（**第 4 日承接**）；② summary 最后一句「本站中文《线性代数讲义》之外，按 Strang 教法重构的英文姊妹篇」引用中文版仍不存在（**第 4 日承接**）。都属设计/写作判断、不擅改。
- LaTeX 化状态：✅ 已 LaTeX 化（`files/linear-algebra/source-strang/chapters/ch{1..10}.tex` 4015 行 + `main.tex` 112 行 + `commands.tex` / `theorems.tex` 共 221 行，6-24 落地）。

**抽检 4/10 · `note`（GRE 写作 · Issue Pool 分类）· `_notes/gre/gre-issue-pool.md`**（76 行 / 3.0 KB · 2024-06-22）
- 已修复：无。
- front-matter ✅：layout=post / main_category=学习资料 / sub_category=GRE / title「GRE Issue Pool」/ discipline=语言考试 / course=GRE / material_type=写作 / date=2024-06-22 / keywords ×12（「GRE Issue Pool」/「GRE 作文题库」/「Analytical Writing」/「GRE 写作题库」/「Issue 分类」/「GRE AW」/「ETS Issue Pool」/「GRE 作文模版」/「Issue 范文」/「exam documentclass」/「Issue Pool 分类」/「GRE 作文题库」）。
- 内容观感 ✅：开篇一句承上、然后两段落引官方 Issue Pool + 评分样例链接，接「期末季结束第一天」生活感小段、再讲文档 LaTeX `documentclass{exam}` 出处并贴最小可复现的 minipage + uline header 代码块、末尾 14 张分类截图（每张 alt 文本均独立描述页面内容："包含 Claim-Reason 型题目 20–25" 之类）。结构与调性自然。
- 图文 ✅：14 张 jpg 全部用 markdown `![alt](url)` 格式，alt 自足描述（无 `<p class="img-caption">` 但属意图——纯为 PDF 截屏分类索引、alt 已传达内容）；`img_caption_md.py` clean、无 markdown 残留。
- 长期建议：keywords ×12 偏单薄（站内同类长文常 25+ 条）；可日后补「Argument Pool 区别」/「GRE 写作 6 分」/「GRE 作文模板分类」/「光华 GRE 备考」/「PKU GRE Issue」等同义词。属内容写作小优化、非紧急。

**抽检 5/10 · `note`（科研妙招 · LaTeX 快捷键）· `_notes/research/latex-commands.md`**（301 行 / 15.9 KB · 2026-04-20）
- 已修复：无。
- front-matter ✅：layout=post / title「我常用的LaTeX快捷键大全」/ main_category=科研妙招 / sub_category=LaTeX相关 / date=2026-04-20 / author=Zircon / permalink=/research/latex/latex-commands / keywords ×32 覆盖核心搜索词（「LaTeX 快捷键」/「LaTeX 自定义命令」/「newcommand」/「renewcommand」/「commands.tex」/「LaTeX 宏定义」/「数学符号简写」/「mathbb 数集」/「自动伸缩括号」/「DeclareMathOperator」/「算子定义」/「草稿 TODO 宏」/「LaTeX macros」/「amsmath」/「aligned cases 简写」/「写公式提速」/「LaTeX 偷懒」/「Latex 快捷键」错别字/「Overleaf」/「VSCode LaTeX」/「LaTeX 笔记 PhD」/「经济学 LaTeX」/「single letter macros」/「renew 命令冲突」等）。
- 内容观感 ✅：开篇有共情段（"为什么需要构建自己的 LaTeX 快捷键"）→ 完整 commands.tex 代码全文 17 类宏（aligned/cases、blackboard bold、calligraphic、向量、Greek、自动伸缩、operators、概率期望、收敛、微积分、关系、求和、博弈论、复分析、draft TODO、高亮）→ 三段「为什么需要快捷键」分析 → 5 段 commands.tex 核心用法解析（基础替换、自动伸缩、可选参数+默认值、operators 正规化、Draft 开关），最后一段结语；调性自然且工程化、配合站内的 LaTeX 化推广路线、与同 sub_category 的 LaTeX 学术写作长文系列协同。
- 排版 ✅：用 `{% raw %} ... {% endraw %}` 包裹整段 LaTeX 代码、防止 Liquid 解析 `{{...}}`；inline math 用 `$...$`、code block 用 ` ```latex`；少数行内中文夹少量带 `<span style="color:#888;font-size:0.9em;">（注：...）</span>` HTML 注释（非图片 caption、属内文 sidenote，不违反 caption 约定）。

**抽检 6/10 · `pdf_archive` · `files/corp-fin/mid-sample-1.pdf`**（458.6 KB）
- 已修复：无。
- 归属 ✅：被 `_notes/study/corp-fin/mid-sample-1.md` 唯一引用 `pdf_url: "/files/corp-fin/mid-sample-1.pdf"`，路径有效；front-matter 完整（layout=post / sub_category=公司财务管理 / course=公司财务管理 / material_type=Exams / date=2022-09-01 / author=Zircon / discipline=管理学 / permalink=/notes/corp-fin/mid-sample-1 / keywords ×24 覆盖「公司财务期中样卷 1 试题」/「corp fin midterm sample 1」/「公司财物 期中 样卷」错别字 /「公司金融 期中题」/「corporate finance midterm」/「WACC 计算」/「NPV 题目」/「IRR 题目」/「CAPM 题目」/「资本结构题」/「MM 定理 题」/「杠杆 题目」/「贝塔 计算」/「股利政策 题目」/「敏感性分析 题目」/「光华 公司财务」/「PKU corp fin midterm」等核心搜索词）；summary 简洁明确（「光华本科《公司财务管理》期中样卷 1 题面 PDF。配套答案见 mid-sample-1-sol.md；可掐时做完后对照。」与 6-25 抽检的 `mid-sample-4-sol.pdf` 答案版互参）。
- 体积合理性：458.6 KB < 5 MB，本科样卷题面合理体量。
- LaTeX 化潜力：低——本科课程一次性样卷题面 PDF 存档无更新需求，建议维持 PDF 存档。

**抽检 7/10 · `note`（科研妙招 · 可复现项目搭建）· `_notes/research/reproducible-project.md`**（201 行 / 11.1 KB · 2026-05-20）
- 已修复：无。
- front-matter ✅：layout=post / title「可复现的研究项目怎么搭：数据-代码-输出分离、相对路径、renv 与 AEA data policy」/ main_category=科研妙招 / sub_category=科研工作流 / date=2026-05-20 / author=Zircon / permalink=/research/workflow/reproducible-project / keywords ×30 覆盖核心搜索词（「可复现研究」/「复现 reproducibility」/「replication package」/「复现包」/「AEA data policy」/「AER 数据政策」/「数据可用性政策」/「data availability」/「研究项目结构」/「项目目录结构」/「数据代码输出分离」/「相对路径」/「setwd 绝对路径」/「here 包」/「here::here」/「RProject Rproj」/「renv 锁依赖」/「依赖管理」/「set.seed 随机种子」/「Stata set seed」/「master do 文件」/「run_all」/「Makefile 复现」/「README 写法」/「原始数据只读」/「raw data read only」/「gitignore 数据」/「三个月后跑不出来」/「审稿复现」/「kefuxian」/「复现性」拼音都覆盖了）。
- 内容观感 ✅：开篇两个常见痛点（replication package 来不及 / 改清洗代码数字对不上）→ 八节正文（心智模型 + 目录结构 + 相对路径 + master 主脚本 + 随机种子 + 锁依赖 renv + README/.gitignore + AEA 数据政策自查）→ 末段总结「复现性不是写出来的，是在别的机器上跑通一次验出来的」。三个语言（R / Stata / Python）的并列示例完整，调性技术 + 实战、与同 sub_category 的「latex-commands」「latex-cheatsheet」科研工作流系列协同。
- 图文 ✅：内嵌一张 inline SVG 流程图（`data/raw/` → `code/` → `output/` 三盒 + 两个箭头 + 注脚说明）符合「图首选 inline SVG」站内约定（[[reference_inline_svg]]），无外链图片资源。
- 排版 ✅：markdown 列表 / 三层 heading（## → ###）/ ` ``` ` fenced code blocks（r / stata / makefile / gitignore 多种语言高亮）/ 中英文混排自然、中文不用斜体。

**抽检 8/10 · `pdf_archive` · `files/adv-macro-psu/chapters/ch5.pdf`**（195.4 KB · "Ch 5: The Solow Growth Model"）
- 已修复：无。
- 归属 ✅：被英文学术主页 `index.html:638` 唯一引用 `<li><a href="/files/adv-macro-psu/chapters/ch5.pdf">Ch 5: The Solow Growth Model</a></li>`，是 adv-macro-psu 高级宏观（PSU 博士课）章节切片之一（同目录 ch1~ch12 共 12 个 PDF 全在 `index.html` Adv. Macro PSU 章节卡里以章节标题列出）。
- 体积合理性：195.4 KB << 5 MB，章节切片合理。
- LaTeX 化状态：⚠️ **实际已 LaTeX 化、但 spotcheck.py 启发式漏判**——同目录存在 `ch5_solow.tex`（同 dir 主题后缀模式：`ch1_complete_markets.tex` / `ch2_exogenous_incomplete.tex` / `ch3_endogenous_incomplete.tex` / `ch4_growth_accounting.tex` / `ch5_solow.tex` / `ch6_neoclassical.tex` / `ch7_neoclassical_vs_data.tex` / `ch8_rbc.tex` 等 ≥8 个），但 `spotcheck.py` L185 `fp.with_suffix(".tex")` 只查同基名 `ch5.tex` 找不到 → 误把这份 PDF 纳入 pdf_archive 候选池。**已记入 P2 #2 待你拍板是否增强脚本启发式**（不擅自修脚本逻辑）；实际章节合订本 `files/adv-macro-psu/Macro.pdf` 是 LaTeX 化主交付物，章节切片就是合订本拆页快捷下载入口。建议**维持现状**。

**抽检 9/10 · `lecture_note_pdf_only` · `_notes/study/adv-micro-pku/adv-micro-pku-2023.md`**（17 行 / 1.3 KB · 北大高微课程笔记）
- 已修复：无。
- 一致性 ✅：`pdf_url: "/files/adv-micro-pku/adv-micro-pku-2023.pdf"` 路径有效；front-matter 完整（layout=post / main_category=学习资料 / sub_category=高级微观经济学（北大）/ course=高级微观经济学（北大）/ material_type=Notes / date=2023-09-01 / author=Zircon / discipline=经济学 / permalink=/notes/adv-micro-pku/adv-micro-pku-2023 / keywords ×30 厚足覆盖中英文术语「高级微观经济学 笔记」/「高微 北大」/「advanced microeconomics PKU」/「MWG 中文笔记」/「Mas-Colell Whinston Green」/「效用最大化」/「支出最小化」/「Hicksian Marshallian」/「Slutsky 方程」/「Walras 均衡」/「Edgeworth box」/「Nash 均衡」/「机制设计」/「信息经济学」/「外部性 公共品」/「高级微观 PhD 笔记」/「经济学 PhD 高微」/「北大经院 高微」等核心搜索词）；summary 介绍清晰（「北大《高级微观经济学》（2023）课程笔记 PDF 完整版（含 6 章 chapters/ 分章）：消费者理论 + 生产者理论 + 一般均衡 + 博弈论 + 信息经济学。对照 MWG（Mas-Colell/Whinston/Green）教材编写，是博一前置准备的常用读物。」）。
- LaTeX 化建议：② 加入低优队列——同站内 `_notes/study/adv-micro-pku/chapters/` 已切分若干章节 PDF + cheat-sheet，是博一前置常用读物；属偶尔参考型，LaTeX 化优先级低于站主 PhD 自己实战课程（adv-micro-psu / adv-metrics-psu）。建议维持 PDF 存档即可。

**抽检 10/10 · `game` · `toolbox/picker/index.html`**（666 行 / 22.0 KB inline · "遇事不决"转盘小工具）
- 已修复：无。
- 一致性 ✅：front-matter 完整（layout=default / title「遇事不决 | Rui Zhou」/ permalink=/toolbox/picker/）；inline-only 单文件；11 处 `:hover` 全部包在 `@media (hover: hover)` 守卫内（`profile-action:hover` / `option-row .opt-del:hover` / `add-row button:hover` / `pill-group button:hover` / `spin-btn:hover` / `skip-btn:hover` 等），`hover_no_media.py` clean 印证；深色模式 token 适配齐全（全部颜色走 `var(--color-accent)` / `var(--color-border)` / `var(--color-muted)` 等 CSS 变量，无硬编码 hex）。
- UI 设计 ✅：profile-bar 方案管理条 + 选项行 grid（删除 + 文本 + 权重滑块 + 百分比）+ 模式 pill-group + spin-btn + 转盘 SVG（aspect-ratio 1:1 + min(320px, 88vw, 42vh) 三约束自适应）+ result-zone + tally-panel 多次模式计票，结构清晰、典雅风格，符合站点整体设计。
- 长期建议：666 行 < 1000 行拆分阈值，状态健康；无 console 残留；无明显待优化点。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点本次 `backend_pulse.py` 仍全报 HTTP 403。与 5-27 ~ 6-26 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。**今日 0 个新 commit**，三件套无新增依赖。

---

## 2026-06-26

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项；今日周五 DOW=5，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=26，未跑 monthly_stats）。距 6-25 巡检共 **0 个 commit**（HEAD 仍是 `dfd38eb`，即昨日自动巡检 commit；自昨日 24:00 后无新提交，工作树纯净）。`bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（13.683 s，cold build）。今日 `scripts/audit/run.sh` 全套审计 **13/13 每日项全 clean**——`keywords_coverage`（散文 121 篇全部充足，与 6-25 完全一致）/ `images`（仅 `files/interm-macro/interm-macro-2022-zh.pdf` 2.13 MB 大文件，承接 6-16 中文版讲义首发，markdown 入口正常，与 6-16 ~ 6-25 同；昨日新增的三份 LaTeX PDF 仍 < 1 MB 阈值下，无新增）/ `material_type_enum`（**分布完全无变化**：Notes ×46 / Exams ×40 / 课程测评 ×18 / 经验之谈 ×5 / 错题本 ×3 / 写作 ×2 / 口语 ×1 / 词汇 ×1，承接 6-25）/ `filename_convention`（6-24 `ACCEPTED_UNDATED` 白名单已加 3 个新讲义合订本，今日 0 命中）/ `hover_no_media`（无新代码改动，clean）/ `sibling_crosslink`（10 个 ≥3 篇 sub_category 组全互链，承接 6-25）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检见下）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-25，沙箱无 fly.io 出口）。**今日 0 项自动修复**——0 个新 commit、所有审计 clean、抽检 10 项无新增问题。**P1 队列**：承接昨日两条 `study_order` 缺项——①承接 13 日的 `interm-econometrics`（**第 14 日承接**）、②承接 1 日的 `linear-algebra`（**第 3 日承接**），核对 `comm -23` 差集仍是这两条；都属 IA 设计判断、不擅改。

### ✅ 本次已自动修复

无。

距上次 review 0 个新 commit，工作树纯净（`git status` clean、`git ls-files --others --exclude-standard` 空），所有 13 项每日审计 clean，抽检 10 项无可自动处理项，**无需任何修复**。今日唯一动作是更新本 DAILY_REVIEW.md 文档。

### 📋 待你把关

#### P0（紧急）
无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 / 6-14 / 6-15 / 6-16 / 6-17 / 6-18 / 6-19 / 6-20 / 6-21 / 6-22 / 6-23 / 6-24 / 6-25，**第 14 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、120 页 Wooldridge 体系教科书式英文讲义，与同 sub_category 的 `interm-metrics/interm-metrics-2023.md` 课程笔记本同名相近但目录不同）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 共 25 个目录、`study_order` 共 23 条，`comm -23` 差集为 `interm-econometrics`、`linear-algebra` 两条，承接昨日不变。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）属设计判断，仍请你拍板。

2. **`_config.yml` 的 `study_order` 仍未列 `linear-algebra` 文件夹**（承接 6-24 / 6-25，**第 3 日承接**）—— `dfbb84c` 6-24 新建的 `_notes/study/linear-algebra/linear-algebra-strang.md` 因 `study_order` 没列 `linear-algebra`，**在 `/notes/index.html` 数学组里渲染不出来**（sitemap / search.json / `_site/notes/linear-algebra/linear-algebra-strang.html` 都正常输出，仅 landing 缺）。`_config.yml` 中数学组当前只有 `real-anal` 一条；自然位置是放在 `real-anal` 之前（线性代数比实分析更基础）。**但放在何处属顺序判断，且未来可能还会加中文版**（详见 P2#1），故仍写进待办由你拍板。

#### P2（建议）

1. **`linear-algebra-strang.md` 的 summary 引用「本站中文《线性代数讲义》」但仓库内仍不存在**（承接 6-24 / 6-25）—— `grep "course.*线性代数" _notes/study/` 仍只命中 strang 这一篇，未发现中文姊妹版。summary 最后一句「这是本站中文《线性代数讲义》之外，按 Strang 教法重构的英文姊妹篇」会让读者点过去找不到中文版。两种可能：① 中文版还在 LaTeX 化排队待上线 → 等中文版落地再放出；② 临时占位文案 → 删去「之外，按 Strang 教法重构的英文姊妹篇」这句、改成自足介绍。**属内容写作判断、请你拍板**。
2. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接自 6-03。功能正确，纯排版风格小差异，可忽略。
3. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接自 6-03。已有「同课程自动侧栏」覆盖（`sibling_crosslink.py` ✅）但缺手写互链段落引导。属内容写作决策。
4. **掼蛋 6-18 ~ 6-24 期间联机改造 + 调试链路收尾共 23 个 commit 待真机/微信内置浏览器跑两局完整联机回归** —— 承接 6-25 P2#4。重点回归：① 联机终局对方看到最后一手桌面（`0fcd7ed` mp19）；② 调试台 4-Tab + 字体放大 + 融合 test/quad（`97d9c72`）；③ Web Audio 合成音效（`7d9197a`）。沙箱无浏览器/音频出口无法替代真机回归。
5. **宠物中心发布前整改共 4 commit 21 条修复（Quick Wins 14 + P0 7 + 体重模块升级）待多浏览器/多设备验收** —— 承接 6-25 P2#5。建议站主在 iPhone Safari + Android Chrome + 桌面 Chrome + 桌面 Firefox 至少四个组合下，过一遍真宠物中心 board——加 1 条体重 + 加 1 条饮食 + 触发一次 mismatch + 切深色模式 + 切 prefers-reduced-motion + 离线刷新 + 多端共享 + 撤销作差链 + Esc 关闭所有弹窗。沙箱无 GUI / 无真触屏，确确实实跑不了。
6. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 6-17 `008ff4f` 落地 74 首安全改善后剩余的「英文歌 / 翻唱抓错 CD / ASR 漂移」等问题首站主可继续推进。属内容修复决策（承接自 6-18 ~ 6-25）。
7. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 / 6-15 / 6-22 / 6-23 / 6-24 / 6-25）—— `centretax.net` / `offcampus.psu.edu` / `www.hwdrivingschool.com` / `www.judicialinformation.com` / `www.textile-outlook.com`。今日 DOW=5 未跑 `dead_links.py`，下个周一（6-29）会再次扫到；属沙箱无 DNS 出口的已知现象，需站主在生产 / 本机复验。
8. **`dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间字符串误判为外链**（沿用 6-08 / 6-22 / 6-23 / 6-24 / 6-25）—— audit 脚本 cosmetic（6-10 已有 SKIP_URL_PATTERNS 但仍偶发命中）；非阻塞。
9. **抽检 6/10 ~ 6-25 `_notes/tutoring/math-thinking.md` 仅 48 行 / 1.1 KB，但有 `pdf_url`，正文 0 字 + 无 summary**（承接 6-25 P2#9）—— `_notes/study/`-外（属 `tutoring/`），permalink `/notes/tutoring/math-thinking` 渲染需依赖 PDF 内嵌兜底。建议日后老文盘扫一并补 `summary` 字段；当下不影响功能。本日抽检的 `_notes/tutoring/sphere.md`（5/10）属同类——49 行 / 1.1 KB，有 `pdf_url: /files/tutoring/sphere/Main.pdf`、permalink `/notes/tutoring/sphere`、front-matter 完整含 31 个 keywords（覆盖「内切球 外接球」/「inscribed sphere circumscribed sphere」/「外接求」错别字/「补形法」/「截面法」/「高考 外接球 内切球」等），但同样**无 `summary` 字段** + 正文 0 字，PDF-only 存档。`tutoring/` 系列普遍如此（pdf-only 教辅讲义），是历史模式而非新增问题；建议日后补 `summary` 时优先涵盖此目录。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化**——0 个新 commit、`git status` clean、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、无副本文件 / 密钥 / 凭证 / 个人路径痕迹。6-24 新增的三份 LaTeX 讲义 PDF + source 树（`files/linear-algebra/source-strang/` / `files/mao-thought/source/` / `files/marxism/source/`）已纳入既有 LaTeX source 目录约定（不进 `_config.yml` exclude，要进站让人下载源码），今日无新增。`_config.yml` 的 `exclude:` 列表已含 `DAILY_REVIEW.md`、`EMAIL_SUMMARY.md`、`SPOTCHECK_*`、`TOOLBOX_AUDIT_REPORT.md`、`docs/`、`scripts/`、`tools/`、`_paid/`、`audio/`、`backends/`、`.claude/`、`.githooks/` 等所有内部目录与产物，状态与昨日完全一致。`.gitignore` 状态未变。**结论**：与 6-23 / 6-22 / 6-21 / 6-20 / 6-19 / 6-18 / 6-17 / 6-16 / 6-15 / 6-25 同——仓库目录基线稳定，无可优化空间，跳过结构调整。

### 🔬 抽检专项

**抽检 1/10 · `game` · `toolbox/2048/index.html`**（980 行 / 33.8 KB inline）
- 已修复：无。
- 一致性 ✅：front-matter 完整（layout=default / title「2048」/ permalink=/toolbox/2048/）；inline-only 单文件；3 处 `:hover` 全部 `@media (hover: hover)` 守卫（`hover_no_media.py` clean 印证）；深色模式 `:root[data-theme="dark"]` token 适配齐全；触摸事件（pointerdown/move/up）覆盖完整。
- 长期建议：980 行紧贴 >1000 行拆分阈值，与站内大型 inline 工具普遍超阈值（doudizhu 2400 行 / pitch 1107 行 / snake 1017 行同性质）是建设期可接受历史包袱。属架构决策、需站主拍板。

**抽检 2/10 · `pdf_archive` · `files/adv-micro-psu/2025-midterm-2.pdf`**（47.1 KB）
- 已修复：无。
- 归属 ✅：被 `_notes/study/adv-micro-psu/2025-midterm-2.md` 唯一引用 `pdf_url: "/files/adv-micro-psu/2025-midterm-2.pdf"`，路径有效；front-matter 完整（layout/main_category/sub_category=高级微观经济学（PSU）/course/material_type=Exams/date=2025-04-01/author=Zircon/discipline=经济学/permalink=/notes/adv-micro-psu/2025-midterm-2/keywords ×20 覆盖核心搜索词「高级微观经济学期中 2（2025）」/「高微 PSU 期中 2」/「ECON 521 midterm 2025」/「Penn State 高微 真题」/「Krishna 高微 期中」/「mechanism design 期中」/「机制设计 试题」/「auction theory midterm」/「拍卖理论 真题」/「signaling games 期末题」/「VCG mechanism」/「revelation principle 例题」等）；summary 介绍清晰（「PSU ECON 521 高级微观经济学 2025 春第二次期中真题（题面 PDF，无答案）。覆盖博弈论 / Nash 均衡 / 拍卖与机制设计 / matching 等 MWG 教材后半章节考点；可与同年期中 1 + 期末作系列对照。」）。
- 体积合理性：47.1 KB << 5 MB，符合期中真题切片体量；未列入 `EXEMPT_FILES`、`images.py` 未报。
- LaTeX 化潜力：低——本科课程一次性真题 PDF 存档无更新需求，建议维持 PDF 存档。

**抽检 3/10 · `lecture_note_pdf_only` · `_notes/study/interm-econometrics/interm-econometrics-2023.md`**（16 行 / 3.8 KB · 2023 中级计量讲义）
- 已修复：无。
- 一致性 ✅：`pdf_url: "/files/interm-econometrics/interm-econometrics-2023.pdf"` 路径有效；front-matter 完整（layout/main_category/sub_category=中级计量经济学/course/material_type=Notes/date=2023-09-01/author="Rui Zhou"/discipline=经济学/permalink=/notes/interm-econometrics/interm-econometrics-2023）；summary 介绍详尽（「光华金融经济方向《中级计量经济学》（2023 春，宋晓军）整学期课堂笔记，重写并统一为一本自足的英文教科书式讲义（120 页，教科书彩色盒子排版，定义/定理/假设/例子分色）……可对照 Wooldridge 教材自学或期末复习时通读。」覆盖 8 大模块）；keywords ×93 厚足覆盖中英文术语 + 课程别名 + 教材名 + 错别字。
- LaTeX 化建议：高——120 页英文教科书式自著讲义、已 LaTeX 排版（推测 `files/interm-econometrics/source/` 存在源码），属高频复用资料；但本日审计中**未核对源码目录是否存在**，写进 P1 #1 一并由站主拍板与 `interm-metrics/` 的关系。
- **承接 P1 #1**：此 .md 因 `study_order` 未列 `interm-econometrics`，**在 `/notes/index.html` 中级计量经济学组渲染不出来**，仅靠 sub_category 自动侧栏与 search.json 兜底。属设计判断、不擅改。

**抽检 4/10 · `game` · `toolbox/snake/index.html`**（1017 行 / 34.0 KB inline）
- 已修复：无。
- 一致性 ✅：front-matter 完整（layout=default / title「贪吃蛇」/ permalink=/toolbox/snake/）；inline-only 单文件；`:hover` 全部 `@media (hover: hover)` 守卫；深色模式适配齐全；触屏方向手势已实现。
- 长期建议：1017 行已越 >1000 行拆分阈值（与站内 doudizhu 2400 行 / pitch 1107 行 / vision 1935 行同性质）是建设期可接受历史包袱。属架构决策、需站主拍板。

**抽检 5/10 · `note`（教辅 · 球的内切外接） · `_notes/tutoring/sphere.md`**（49 行 / 1.1 KB · PDF-only 存档）
- 已修复：无。
- front-matter ✅：title「球（内切球与外接球）」/ sub_category=数学 / discipline=初升高 / course=数学 / material_type=Notes / date=2026-01-22 / permalink=/notes/tutoring/sphere / `pdf_url: /files/tutoring/sphere/Main.pdf` 路径有效 / keywords ×31 覆盖「内切球 外接球」/「inscribed sphere circumscribed sphere」/「外接求 内切求」错别字 /「补形法」/「截面法」/「高考 外接球 内切球」/「初升高 球」/「正四面体 外接球」/「球面距离」等核心搜索词。
- 待办：**无 `summary` 字段** + 正文 0 字，PDF-only 存档纯依赖 PDF 内嵌兜底（与 6-25 抽检的 `math-thinking.md` 同类）。已并入 P2 #9。

**抽检 6/10 · `lecture_note_full` · `_notes/study/real-anal/real-anal-ch6-2024.md`**（20 行 / 1.8 KB · 实分析 Ch6 Banach Spaces）
- 已修复：无。
- 一致性 ✅：title「Real Analysis Ch6 Banach Spaces」/ sub_category=实分析 / discipline=数学 / course=实分析 / material_type=Notes / date=2024-09-01 / author=Zircon / permalink=/notes/real-anal/real-anal-ch6-2024 / `pdf_url: /files/real-anal/real-anal-ch6-2024.pdf` 路径有效 / keywords ×31 厚足覆盖（「实分析 Ch6 Banach 空间」/「Real Analysis Banach Spaces」/「Hahn-Banach 定理」/「open mapping theorem」/「closed graph theorem」/「Baire 范畴定理」/「uniform boundedness principle」/「BLT 定理」/「Folland 教材」/「Royden 教材」/「Math 597 real analysis」/「UMich 实分析」/「PhD 实分析 笔记」等核心搜索词）；summary 介绍清晰（章节核心模块概览）；正文 1 段引导 + LaTeX 源码 link `<p class="img-caption">LaTeX 源码：…</p>` 配文样式合规。
- LaTeX 化状态：✅ 已 LaTeX 化（`files/real-anal/source/real-anal-ch6-banach-spaces.tex` 存在）。

**抽检 7/10 · `pdf_archive` · `files/adv-micro-psu/chapters/ch7.pdf`**（132.4 KB）
- 已修复：无。
- 归属 ✅：被英文学术主页 `index.html:622` 唯一引用 `<li><a href="/files/adv-micro-psu/chapters/ch7.pdf">Ch 7: Common Knowledge</a></li>`，是 adv-micro-psu 高级微观（PSU 博士课）章节切片之一（与 6-25 抽检的 `adv-micro-pku/chapters/ch4.pdf`、6-23 的 `adv-micro-psu/chapters/ch1.pdf` 同 pattern）。
- 体积合理性：132.4 KB << 5 MB，章节切片合理。
- LaTeX 化潜力：低——`files/adv-micro-psu/chapters/` 内只有 PDF 无独立 .tex 源码（6-13 / 6-23 早先 daily-review 中曾误判该目录"已 LaTeX 化"，本日核对：`ls files/adv-micro-psu/chapters/` 仅 ch1.pdf…ch9.pdf 共 9 个 PDF，**无任何 .tex 源**）。但章节合订本 `files/adv-micro-psu/adv-micro-psu-lecture-notes.pdf` 已是 LaTeX 化主交付物，章节切片实为合订本拆页快捷下载入口，**章节级 .tex 源不强求**。建议维持现状。

**抽检 8/10 · `note`（留学攻略 · 信用卡跑路） · `_notes/life/can-i-default-and-leave-us.md`**（506 行 / 28.6 KB）
- 已修复：无。
- front-matter ✅：title「能爆刷信用卡然后回国吗？拖欠房租水电话费的法理与实务」/ sub_category=留学攻略 / date=2026-04-03 / permalink=/life/can-i-default-and-leave-us / keywords ×21 覆盖核心搜索词（「爆刷信用卡回国」/「信用卡刷爆跑路」/「回国前不还信用卡」/「拖欠房租水电话费」/「留学生回国债务」/「跨境追债」/「中美法院判决不互认」/「collection agency 催收」/「H-1B 续签债务」/「good moral character」/「绿卡背景审查」/「IRS 欠税护照吊销」/「wire fraud 信用卡诈骗」/「永久回国财务收尾」等）。
- 内容观感 ✅：506 行多章长文，开篇「这篇文章给谁看」三类人 + 风险定位非常清楚（"很多人偷偷想问、但没人公开写"）；属「留学攻略」典范长文，调性兼顾敏感话题的审慎与现实主义。

**抽检 9/10 · `lecture_note_full` · `_notes/study/real-anal/real-anal-ch5-2024.md`**（20 行 / 1.6 KB · 实分析 Ch5 Lp Spaces）
- 已修复：无。
- 一致性 ✅：title「Real Analysis Ch5 Lp Spaces」/ sub_category=实分析 / discipline=数学 / course=实分析 / material_type=Notes / date=2024-09-01 / author=Zircon / permalink=/notes/real-anal/real-anal-ch5-2024 / `pdf_url: /files/real-anal/real-anal-ch5-2024.pdf` 路径有效 / keywords ×30 厚足覆盖（「实分析 Ch5 Lp 空间」/「Real Analysis Lp Spaces」/「Hölder 不等式」/「Minkowski 不等式」/「Jensen 不等式」/「Riesz-Fischer 定理」/「Lp 完备性」/「对偶空间 Lp」/「Folland 教材」/「Royden 教材」/「PhD 实分析 笔记」/「Michigan 实分析 讲义」等）；summary 介绍清晰（"从 Hölder、Minkowski、Jensen 三大不等式出发，证明 Lp 的完备性（Riesz-Fischer 定理）并讨论对偶与可分性。准备 qual 或啃 Folland/Royden 第五章时可以对照看"）；正文 1 段引导 + LaTeX 源码 link 配文样式合规。
- LaTeX 化状态：✅ 已 LaTeX 化（`files/real-anal/source/real-anal-ch5-lp-spaces.tex` 存在）。

**抽检 10/10 · `game` · `toolbox/doudizhu/index.html`**（2400 行 / 92.8 KB inline）
- 已修复：无。
- 一致性 ✅（与 6-25 / 6-23 抽检结论一致）：front-matter 完整（layout=default / title「斗地主」/ permalink=/toolbox/doudizhu/），`:hover` 全部 `@media (hover: hover)` 守卫（`hover_no_media.py` clean 印证）；同目录 `engine.test.html` 测试页存在 console.log 残留属测试代码不影响生产；inline-only。
- 长期建议：2400 行已是站内最大 inline 工具（与 vision 1935 行、guandan 大型 inline 同性质——是建设期可接受历史包袱）。属架构决策、需站主拍板。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点本次 `backend_pulse.py` 仍全报 HTTP 403。与 5-27 ~ 6-25 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。**今日 0 个新 commit**，三件套无新增依赖。

---

## 2026-06-25

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项；今日周四 DOW=4，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=25，未跑 monthly_stats）。距 6-24 巡检共 **0 个 commit**（HEAD 仍是 `c207a32`，即昨日自动巡检 commit；自昨日 24:00 后无新提交，工作树纯净）。`bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（12.609 s，cold build）。今日 `scripts/audit/run.sh` 全套审计 **13/13 每日项全 clean**——`keywords_coverage`（散文 121 篇全部充足，与 6-24 完全一致）/ `images`（仅 `files/interm-macro/interm-macro-2022-zh.pdf` 2.13 MB 大文件，承接 6-16 中文版讲义首发，markdown 入口正常，与 6-16 ~ 6-24 同；昨日新增的三份 LaTeX PDF 仍 < 1 MB 阈值下，无新增）/ `material_type_enum`（**分布完全无变化**：Notes ×46 / Exams ×40 / 课程测评 ×18 / 经验之谈 ×5 / 错题本 ×3 / 写作 ×2 / 口语 ×1 / 词汇 ×1，承接 6-24）/ `filename_convention`（昨日 `ACCEPTED_UNDATED` 白名单已加 3 个新讲义合订本，今日 0 命中）/ `hover_no_media`（无新代码改动，clean）/ `sibling_crosslink`（10 个 ≥3 篇 sub_category 组全互链，承接 6-24）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检见下）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-24，沙箱无 fly.io 出口）。**今日 0 项自动修复**——0 个新 commit、所有审计 clean、抽检 10 项无新增问题。**P1 队列**：承接昨日两条 `study_order` 缺项——①承接 13 日的 `interm-econometrics`（**第 13 日承接**）、②承接 1 日的 `linear-algebra`（**第 2 日承接**），核对 `comm -23` 差集仍是这两条；都属 IA 设计判断、不擅改。

### ✅ 本次已自动修复

无。

距上次 review 0 个新 commit，工作树纯净（`git status` clean、`git ls-files --others --exclude-standard` 空），所有 13 项每日审计 clean，抽检 10 项无可自动处理项，**无需任何修复**。今日唯一动作是更新本 DAILY_REVIEW.md 文档。

### 📋 待你把关

#### P0（紧急）
无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 / 6-14 / 6-15 / 6-16 / 6-17 / 6-18 / 6-19 / 6-20 / 6-21 / 6-22 / 6-23 / 6-24，**第 13 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、与同名旧版 `interm-metrics-2023.md` 同名相近但目录不同）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 共 25 个目录、`study_order` 共 23 条，`comm -23` 差集为 `interm-econometrics`、`linear-algebra` 两条，承接昨日不变。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）属设计判断，仍请你拍板。

2. **`_config.yml` 的 `study_order` 仍未列 `linear-algebra` 文件夹**（承接 6-24，**第 2 日承接**）——`dfbb84c` 6-24 新建的 `_notes/study/linear-algebra/linear-algebra-strang.md` 因 `study_order` 没列 `linear-algebra`，**在 `/notes/index.html` 数学组里渲染不出来**（sitemap / search.json / `_site/notes/linear-algebra/linear-algebra-strang.html` 都正常输出，仅 landing 缺）。`_config.yml` 中数学组当前只有 `real-anal` 一条；自然位置是放在 `real-anal` 之前（线性代数比实分析更基础）。**但放在何处属顺序判断，且未来可能还会加中文版**（详见 P2#1），故仍写进待办由你拍板。

#### P2（建议）

1. **`linear-algebra-strang.md` 的 summary 引用「本站中文《线性代数讲义》」但仓库内仍不存在**（承接 6-24）—— `grep "course.*线性代数" _notes/study/` 仍只命中 strang 这一篇，未发现中文姊妹版。summary 最后一句「这是本站中文《线性代数讲义》之外，按 Strang 教法重构的英文姊妹篇」会让读者点过去找不到中文版。两种可能：① 中文版还在 LaTeX 化排队待上线 → 等中文版落地再放出；② 临时占位文案 → 删去「之外，按 Strang 教法重构的英文姊妹篇」这句、改成自足介绍。**属内容写作判断、请你拍板**。
2. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接自 6-03。功能正确，纯排版风格小差异，可忽略。
3. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接自 6-03。已有「同课程自动侧栏」覆盖（`sibling_crosslink.py` ✅）但缺手写互链段落引导。属内容写作决策。
4. **掼蛋 6-18 ~ 6-24 期间联机改造 + 调试链路收尾共 23 个 commit 待真机/微信内置浏览器跑两局完整联机回归** —— 承接 6-24 P2#4。重点回归：① 联机终局对方看到最后一手桌面（`0fcd7ed` mp19）；② 调试台 4-Tab + 字体放大 + 融合 test/quad（`97d9c72`）；③ Web Audio 合成音效（`7d9197a`）。沙箱无浏览器/音频出口无法替代真机回归。
5. **宠物中心发布前整改共 4 commit 21 条修复（Quick Wins 14 + P0 7 + 体重模块升级）待多浏览器/多设备验收** —— 承接 6-24 P2#5。建议站主在 iPhone Safari + Android Chrome + 桌面 Chrome + 桌面 Firefox 至少四个组合下，过一遍真宠物中心 board——加 1 条体重 + 加 1 条饮食 + 触发一次 mismatch + 切深色模式 + 切 prefers-reduced-motion + 离线刷新 + 多端共享 + 撤销作差链 + Esc 关闭所有弹窗。沙箱无 GUI / 无真触屏，确确实实跑不了。
6. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 6-17 `008ff4f` 落地 74 首安全改善后剩余的「英文歌 / 翻唱抓错 CD / ASR 漂移」等问题首站主可继续推进。属内容修复决策（承接自 6-18 ~ 6-24）。
7. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 / 6-15 / 6-22 / 6-23 / 6-24）—— `centretax.net` / `offcampus.psu.edu` / `www.hwdrivingschool.com` / `www.judicialinformation.com` / `www.textile-outlook.com`。今日 DOW=4 未跑 `dead_links.py`，下个周一（6-29）会再次扫到；属沙箱无 DNS 出口的已知现象，需站主在生产 / 本机复验。
8. **`dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间字符串误判为外链**（沿用 6-08 / 6-22 / 6-23 / 6-24）—— audit 脚本 cosmetic（6-10 已有 SKIP_URL_PATTERNS 但仍偶发命中）；非阻塞。
9. **抽检 6/10 `_notes/tutoring/math-thinking.md` 仅 48 行 / 1.1 KB，但有 `pdf_url`，正文 0 字 + 无 summary**（承接 6-24 P2#9）—— `_notes/study/`-外（属 `tutoring/`），permalink `/notes/tutoring/math-thinking` 渲染需依赖 PDF 内嵌兜底。建议日后老文盘扫一并补 `summary` 字段；当下不影响功能。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化**——0 个新 commit、`git status` clean、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、无副本文件 / 密钥 / 凭证 / 个人路径痕迹。昨日新增的三份 LaTeX 讲义 PDF + source 树（`files/linear-algebra/source-strang/` / `files/mao-thought/source/` / `files/marxism/source/`）已在 6-24 章节核对合规、纳入既有 LaTeX source 目录约定（不进 `_config.yml` exclude，要进站让人下载源码），今日无新增。`_config.yml` 的 `exclude:` 列表已含 `DAILY_REVIEW.md`、`EMAIL_SUMMARY.md`、`SPOTCHECK_*`、`TOOLBOX_AUDIT_REPORT.md`、`docs/`、`scripts/`、`tools/`、`_paid/`、`audio/`、`backends/`、`.claude/`、`.githooks/` 等所有内部目录与产物，状态与昨日完全一致。`.gitignore` 状态未变。**结论**：与 6-23 / 6-22 / 6-21 / 6-20 / 6-19 / 6-18 / 6-17 / 6-16 / 6-15 同——仓库目录基线稳定（昨日扩展后今日继续保持），无可优化空间，跳过结构调整。

### 🔬 抽检专项

**抽检 1/10 · `game` · `toolbox/cat-language/index.html`**（20 行 / 621 B inline）
- 已修复：无。
- 一致性 ✅：极轻量 wrapper（`<div class="cl-wrap">` + `<h1>🐱 猫语板</h1>` + `<p class="sub">点一下，听懂猫在说什么</p>` + `{% include cat-soundboard.html %}`），实际功能与音效全部归 `_includes/cat-soundboard.html`；front-matter 完整（layout=default / title / permalink=/toolbox/cat-language/）；`.cl-head .sub` 已 `font-style: normal` 显式遵循「中文不用斜体」约定。
- 长期建议：无——这是站内最轻的 toolbox wrapper（仅 621 B），include 化复用度高、合理。

**抽检 2/10 · `pdf_archive` · `files/public-econ/public-econ-2023.pdf`**（1.7 MB）
- 已修复：无。
- 归属 ✅：被 `_notes/study/public-econ/public-econ-2023.md` 唯一引用 `pdf_url: "/files/public-econ/public-econ-2023.pdf"`，路径有效；front-matter 完整（layout/main_category/sub_category=公共经济学/course/material_type=Notes/date=2023-09-01/author=Zircon/discipline=经济学/permalink=/notes/public-econ/public-econ-2023/keywords ×27 厚足覆盖中英文术语「公共经济学 笔记」/「public economics notes」/「公经 课程笔记」/「财政学 公共经济」/「皮古税 Pigouvian tax」/「庇古税」/「最优税收 optimal taxation」/「Ramsey rule」/「Mirrlees 最优所得税」/「Atkinson Stiglitz」/「Salanié 公共经济学 教材」等核心搜索词）；summary 介绍清晰、覆盖 8 大模块。
- 体积合理性：1.7 MB < 5 MB，未列入 `EXEMPT_FILES`、`images.py` 未报。
- LaTeX 化潜力：低——本科课程一次性笔记（2023 年定稿）无更新需求，建议维持 PDF 存档。

**抽检 3/10 · `lecture_note_pdf_only` · `_notes/study/adv-metrics-pku/final-2015.md`**（17 行 / 1.4 KB · 2015 高计期末）
- 已修复：无。
- 一致性 ✅：`pdf_url: "/files/adv-metrics-pku/final-2015.pdf"` 路径有效；front-matter 完整（layout/main_category/sub_category=高级计量经济学（北大）/course/material_type=Exams/date=2015-09-01/author=Zircon/discipline=经济学/permalink=/notes/adv-metrics-pku/final-2015）；summary 介绍清晰（「年份偏早，但高计的核心考点这些年变化不大，拿来练手依然合适；想横向对比，可以和站里『高级计量经济学（PSU）』那版一起看」）；keywords ×28 厚足覆盖中英文术语 + 错别字「期未」+「Hayashi Wooldridge 教材」+「metrics qualifying exam PKU」等。
- LaTeX 化建议：③ 维持 PDF 存档即可——2015 年单次期末真题原卷无更新需求。

**抽检 4/10 · `pdf_archive` · `files/adv-metrics-pku/mid-2015.pdf`**（108 KB）
- 已修复：无。
- 归属 ✅：被 `_notes/study/adv-metrics-pku/mid-2015.md` 唯一引用 `pdf_url: "/files/adv-metrics-pku/mid-2015.pdf"`，路径有效；与同年 `final-2015.md` 期末真题配套；front-matter 完整 + summary「考点覆盖渐近理论 / OLS / GLS / 异方差 / 工具变量等高计前半学期核心模块。可与 final-2015 期末真题配套练手」清晰。
- 体积合理性：108 KB < 5 MB，章节切片合理。
- LaTeX 化潜力：低——2015 年单次期中真题原卷。

**抽检 5/10 · `note`（生活之问 · 烘干机 vs 自然晾干）· `_notes/life/dryer-vs-air-dry.md`**（383 行 / 16.8 KB）
- 已修复：无。
- front-matter ✅：title「烘干机 vs 自然晾干，到底哪个好？」/ sub_category=生活之问 / date=2026-04-13 / permalink=/life/dryer-vs-air-dry / keywords ×26 覆盖核心搜索词（"烘干机" / "干衣机" / "tumble dryer" / "热泵烘干机" / "heat pump" / "烘干缩水" / "防静电" / "电热晾衣杆" / "羊毛能烘吗" / "丝绸晾干" / "烘干杀菌" / "除螨" / "阴雨天晾衣" / "衣物寿命"）。
- 内容观感 ✅：383 行五段式结构清晰（问题 → 结论先行 → 详细分析），调性自然；属「生活之问」典范长文。

**抽检 6/10 · `game` · `toolbox/pitch/index.html`**（1107 行 / 37.9 KB inline，音高测量）
- 已修复：无。
- 一致性 ✅（与 6-23 抽检结论一致）：front-matter 完整（layout=default / title / permalink=/toolbox/pitch/），3 处 `:hover` 全部 `@media (hover: hover)` 守卫；inline-only；`hover_no_media.py` clean 印证。
- 长期建议：1107 行已越过 >1000 行拆分阈值（与站内大型 inline 工具普遍超阈值——`toolbox/vision/index.html` 1935 行 / `toolbox/doudizhu/index.html` 2399 行同性质——是建设期可接受历史包袱）。属架构决策、需站主拍板。

**抽检 7/10 · `note`（留学攻略 · 美国驾照完全指南）· `_notes/life/pa-drivers-license.md`**（351 行 / 21.7 KB）
- 已修复：无。
- front-matter ✅：title「美国驾照完全指南（以宾州为例）：中国驾照能用吗？怎么考？能当 ID 用吗？」/ sub_category=留学攻略 / date=2026-03-20 / permalink=/life/pa-drivers-license / keywords ×25 覆盖核心搜索词（"美国驾照完全指南" / "宾州驾照" / "PA driver license" / "中国驾照在美国能用吗" / "国内驾照换美国驾照" / "PennDOT" / "REAL ID" / "金星驾照" / "State ID Card" / "Limited Term" / "F-1 驾照" / "国际驾照 IDP" / "驾炤" 错别字）。
- 内容观感 ✅：351 行多章结构清晰；属「留学攻略」典范长文，与同期 `us-tax-basics-for-students.md` / `us-health-insurance-basics.md` 等串读完整。

**抽检 8/10 · `pdf_archive` · `files/corp-fin/mid-sample-4-sol.pdf`**（126 KB）
- 已修复：无。
- 归属 ✅：被 `_notes/study/corp-fin/mid-sample-4-sol.md` 唯一引用 `pdf_url: "/files/corp-fin/mid-sample-4-sol.pdf"`，路径有效；与同目录题面 `mid-sample-4.md` 配套；front-matter 完整 + summary「公司财务管理期中样卷 4 答案 PDF。覆盖现金流折现、NPV/IRR 决策、资本结构等核心题型的解答；与同目录题面 mid-sample-4.md 配套」清晰；keywords ×22 厚足覆盖中英文术语 + 错别字「公司财物」。
- 体积合理性：126 KB < 5 MB，章节切片合理。
- LaTeX 化潜力：低——本科课程样卷答案 PDF 存档。

**抽检 9/10 · `pdf_archive` · `files/adv-micro-pku/chapters/ch4.pdf`**（114 KB）
- 已修复：无。
- 归属 ✅：被英文学术主页 `index.html:604` 唯一引用 `<li><a href="/files/adv-micro-pku/chapters/ch4.pdf">Ch 4: Comparative Statics</a></li>`，是英文版讲义章节切片之一（与 6-23 抽检的 `adv-micro-psu/chapters/ch1.pdf`、6-22 的 `adv-micro-psu/chapters/ch5.pdf` 同 pattern）。
- 体积合理性：114 KB < 5 MB，章节切片合理。
- LaTeX 化潜力：低——章节级讲义切片，章节 PDF 维持下载入口即可。

**抽检 10/10 · `note`（课程测评 · 数据科学的 Python 基础）· `_notes/course-reviews/python-ds-review-2023.md`**（109 行 / 10.8 KB）
- 已修复：无。
- front-matter ✅：title「（个人向）数据科学的 Python 基础课程测评」/ sub_category=数据科学的 Python 基础 / discipline=计算机 / material_type=课程测评 / course=数据科学的 Python 基础 / review_category=其他 / semester=2022 秋 / keywords ×28 覆盖核心搜索词（"数据科学的 Python 基础" / "Python 数据科学" / "Python data science" / "阮敬" / "光华 Python" / "pandas numpy" / "Anaconda" / "matplotlib" / "scikit-learn" / "本研合上" / "Python 期末 91 题" / "二十大报告 词云" / "词云图 Python" / "光华核心课"）。
- 内容观感 ✅：109 行五段式结构清晰；段落组织合理；选课建议具体；阮敬教授评价具体；与同期课程测评专栏其它篇风格一致。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点本次 `backend_pulse.py` 仍全报 HTTP 403。与 5-27 ~ 6-24 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。**今日 0 个新 commit**，三件套无新增依赖。

---

## 2026-06-24

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项；今日周三 DOW=3，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=24，未跑 monthly_stats）。距 6-23 巡检共 **11 个 commit**（`13e61c8` 之后 → `a7cd412` 为止），是六月以来最密集一波——四条主线并发收尾：① **思政两课 LaTeX 化收尾**：`81085b9` 马原知识点梳理改完整 PDF 讲义（LaTeX 重排，补回此前 `marxism-principles.md` 被掏空的半版正文 —— 旧 .md 1066 → 6 行，正文搬进 `files/marxism/source/marxism-principles.tex` 1317 行 + `files/marxism/marxism-principles.pdf` 44 页 / 456 KB，导语 + 教材封面图 `/files/images/marxism-principles/01.jpg` + LaTeX 源码 link 保留），`a7cd412` 毛概知识点梳理 LaTeX 化上线（PDF-only · 51 页 / 846 KB，新增 `_notes/study/mao-thought/mao-thought-principles.md` 21 行 + `files/mao-thought/source/mao-thought-principles.tex` 1320 行 + 1 张配图 `files/mao-thought/source/fig-deng-lilun.png` 367 KB ——「邓小平理论形成过程表」），两篇都按 ctexbook 排，结构 1:1 忠实、正文未改未扩，与既有期末重点/真题回忆版互链。② **线代英文 Strang 讲义首发**：`dfbb84c` 新建 `_notes/study/linear-algebra/linear-algebra-strang.md` 16 行 + `files/linear-algebra/source-strang/` 15 文件（chapters/ch1–ch10.tex 共 4015 行 + main.tex 112 行 + commands.tex / theorems.tex 共 221 行 + Makefile 等）+ `files/linear-algebra/linear-algebra-strang.pdf` 133 页 / 894 KB；按 MIT 18.06（Gilbert Strang）教法重构，10 章彩色盒子排版 + 内联 TikZ 图（四子空间「大图」、SVD 几何、Strang 房子等）；署名 Rui Zhou、与「同 course 的中文姊妹版」并列（**实际中文版未上线**，详见 P2#1）。③ **掼蛋小局收尾 4 commit**：`5fa5492` 调试台 dbug 面板被开始界面盖住——z-index 9998→999999 提到所有浮层之上（PGO/结算/进贡浮层最高 100000，旧 9998 被盖；同步 bump GD_BUILD + index.html 缓存戳）；`97d9c72` 调试台改 4-Tab 布局 + 字体放大 + 宽 300 px + 融合旧 test/quad 暗号入 Tab 按钮 + 摊牌 revealHands 改两行；`0fcd7ed` 联机终局对方看不到最后一手——根因：`round_end` 立即 `endRound` 把 revealHands=true 摊开各家剩牌，最后一手 `lastPlay` 永远被覆盖；改成 `round_end` 先 `_applyTableNow()+renderAll` 让对方看到最后一手桌面，等 `END_ROUND_DELAY_MS` 后再 endRound 摊牌+弹结算，`_tableTimer` 受 `_tableGen` 管理新帧到来自动 cancel；`7d9197a` Web Audio 合成音效——出牌 click+白噪 / 炸弹三层 sawtooth+白噪 / 不出三角波 / 发牌四音上行 arpeggio / 倒计时 tick / 小局结算上下行乐句 / 整局战报五音上行(胜)四音下行(负)；静音按钮 `🔊/🔇` localStorage 记偏好，AudioContext 懒初始化合规 autoplay policy。④ **宠物中心发布前整改 4 commit**（用户报告 + 自己整改）：`bb21dde` Quick Wins 14 项 + P0 事故级 7 项 + 体重模块升级（趋势图长间隔虚线 / 正常范围带 / 每日刻度 / 悬停读数；hero「近30天」标签仅真有30天内参照才显示；含碗读数<空碗时复用 mismatch modal 引导切「不含碗」；删作业差链中间称重升级 confirm 文案；pullSharedPets entries 整份覆盖→按 id 去重并集；直接填大卡补 >900/<30 per100g、>500 per份 软确认；按份食物当主粮 inline warning；宠物码失效后端 join 后 auto-del；体重面板补记录时间药丸；共 9 文件 +266/-39 行：`_includes/cat-soundboard.html` / `_includes/toolbox/pet/board.html` / `_includes/toolbox/pet/modals.html` / `assets/css/main.css` / `assets/css/pet.css` / `assets/js/pet.js`；最重一笔 `assets/js/pet.js` +157/-19）；`2d2a1ea` 成员名改正文字体（0.88rem，仅回退 shortId 用 monospace 小标）+ storage-warn 顶部补 `env(safe-area-inset-top)` + Esc 关闭补 inbox/food-modal/food-wizard/time-picker 四个弹窗（共 +12/-3）；`1b13c0e` 图表色走 CSS 变量 `--pet-chart-target/--pet-chart-target-bg/--pet-chart-bar/--pet-chart-incomplete` 自动深色模式适配（亮绿 #7fb98f / 亮金 #8b7a5e；pet.js 所有硬编码 hex(#4a7c59/#c9a96e/#b9975f) 替换；涵盖 drawIntraday + drawBars + chart-meta legend；共 +32/-17）；`977e79d` 品牌色 token 统一 `--pet-danger/--pet-error/--pet-gold/--pet-brown`（替换全部硬编码 hex #b07c75/#d9534f/#a87a2a/#8b5a3c；补齐 `:root[data-theme="dark"] .pf-wrap` 支持 nav 主题开关）+ 移动端触摸目标 er-del/er-edit min 44px / trend-tabs button min 44×36 + `@media(prefers-reduced-motion)` 禁猫语 wiggle + EQ 动画 + `@media(max-width:680px)` input/select `font-size: max(16px,0.9rem)` 防 iOS 输入框缩放 + entry-row delta badges 全走 CSS 变量删暗色硬编码覆盖（共 +66/-28）。**11 commit 全部聚焦四条主线，无文章内容偏题改动**。`bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（7.215 s，cold build）。今日 `scripts/audit/run.sh` 全套审计 **12/13 每日项 clean，1 项可自动修复**——`filename_convention` 命中**3 个新 PDF 缺年份**（`files/linear-algebra/linear-algebra-strang.pdf`、`files/mao-thought/mao-thought-principles.pdf`、`files/marxism/marxism-principles.pdf`），三者都是常青「讲义/知识点梳理」合订本（非绑某一年试卷），属审计脚本白名单缺口；其余 `keywords_coverage`（散文 121 篇全部充足，与 6-23 完全一致）/ `images`（仅 `files/interm-macro/interm-macro-2022-zh.pdf` 2.13 MB 大文件承接 6-16 中文版讲义首发，与 6-16 ~ 6-23 同；新增的三份 LaTeX PDF 都在 5 MB 阈值下，分别 894 KB / 846 KB / 456 KB）/ `material_type_enum`（**Notes ×46**——较 6-23 ×44 增 2，正是今日新增的 `linear-algebra-strang` + `mao-thought-principles` 两篇 Notes，其余分布无变化：Exams ×40 / 课程测评 ×18 / 经验之谈 ×5 / 错题本 ×3 / 写作 ×2 / 口语 ×1 / 词汇 ×1）/ `hover_no_media`（pet 4 commit 加了 `@media(hover:hover)` / `prefers-reduced-motion` 一票守卫但**未引入裸 `:hover`**，guandan 4 commit 仅改 z-index / Tab 布局 / Web Audio，全部 clean）/ `sibling_crosslink`（10 个 ≥3 篇 sub_category 组全互链——较 6-23 的 9 个 +1，正是「毛泽东思想…」组从 ≥2 升 ≥3，自动检测到「毛概期末重点 + 毛概期末试题回忆 + 毛概知识点梳理」三篇互链已就位）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检见下）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-23，沙箱无 fly.io 出口）。**今日 1 项自动修复**——`scripts/audit/filename_convention.py` 的 `ACCEPTED_UNDATED` 白名单加 3 个新讲义合订本，与既有 `adv-micro-psu-lecture-notes.pdf`、`adv-macro-psu/Macro.pdf` 等同性质豁免（属 audit 脚本配置维护，零站点内容触碰）。**P1 队列**：①承接 12 日的 `study_order` 未列 `interm-econometrics`；**②新增** `study_order` 未列 `linear-algebra`（新 `linear-algebra-strang.md` 在 `/notes/` landing 渲染不出来），都属 IA 设计判断、不擅改。

### ✅ 本次已自动修复

1. **`scripts/audit/filename_convention.py` 的 `ACCEPTED_UNDATED` 白名单加 3 个新讲义合订本** —— `filename_convention.py` 命中 3 个新 PDF 缺年份（`files/linear-algebra/linear-algebra-strang.pdf` / `files/mao-thought/mao-thought-principles.pdf` / `files/marxism/marxism-principles.pdf`），都是常青「讲义/知识点梳理」合订本，按主题（非年份）组织，跟既有 `adv-micro-psu-lecture-notes.pdf` / `adv-macro-psu/Macro.pdf` 一样应列入白名单（脚本本意就是「绑某一年的试卷/讲义」才要带年份，知识点梳理不绑年份）。改动只 8 行（5 行白名单条目 + 1 行注释），**纯审计脚本配置维护，零站点内容触碰**。复审：`python3 scripts/audit/filename_convention.py` ✅ 重跑 clean、`bundle exec jekyll build` ✅ 通过（7.215 s）。

### 📋 待你把关

#### P0（紧急）
无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 / 6-14 / 6-15 / 6-16 / 6-17 / 6-18 / 6-19 / 6-20 / 6-21 / 6-22 / 6-23，**第 12 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、与同名旧版 `interm-metrics-2023.md` 同名相近但目录不同）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 共 25 个目录（含今日新增 `linear-algebra/`），`study_order` 共 23 条，`comm -23` 差集为 `interm-econometrics`、`linear-algebra` 两条；前者承接 12 日不变。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）属设计判断，仍请你拍板。

2. **`_config.yml` 的 `study_order` 未列 `linear-algebra` 文件夹（新今日）**——`dfbb84c` 新建的 `_notes/study/linear-algebra/linear-algebra-strang.md` 因 `study_order` 没列 `linear-algebra` 这一栏，**在 `/notes/index.html` 数学组里渲染不出来**（sitemap / search.json / `_site/notes/linear-algebra/linear-algebra-strang.html` 都正常输出，仅 landing 缺）。`_config.yml` 中数学组当前只有 `real-anal` 一条；自然位置是放在 `real-anal` 之前/之后（线性代数比实分析更基础）。**但放在何处属顺序判断，且未来可能还会加中文版**（详见 P2#1），故仍写进待办由你拍板：要么加进 study_order 排在 `- real-anal` 上方一行，要么和未来中文版一起加。

#### P2（建议）

1. **`linear-algebra-strang.md` 的 summary 引用「本站中文《线性代数讲义》」但仓库内不存在**（新今日）——`grep "course.*线性代数" _notes/study/` 唯一命中即 strang 这一篇，未发现中文姊妹版。summary 最后一句「这是本站中文《线性代数讲义》之外，按 Strang 教法重构的英文姊妹篇」会让读者点过去找不到中文版。两种可能：① 中文版还在 LaTeX 化排队待上线（与马原/毛概同期改造）→ 等中文版落地再放出；② 临时占位文案 → 删去「之外，按 Strang 教法重构的英文姊妹篇」这句、改成自足介绍。**属内容写作判断、请你拍板**。
2. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接自 6-03。功能正确，纯排版风格小差异，可忽略。
3. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接自 6-03。已有「同课程自动侧栏」覆盖（`sibling_crosslink.py` ✅）但缺手写互链段落引导。属内容写作决策。
4. **掼蛋 6-18 ~ 6-24 期间联机改造 + 调试链路收尾共 23 个 commit（结算闩 / SSE / 倒计时 / 四视角测试 / 逐家亮牌节奏 / 服务端 trail 步进重构 / 进贡还贡演出 / 大厅换座重做 / 头像绑死 / 调试台 dbug + DMC 透视镜 + regress + 4-Tab 布局 + 摊牌两行 + Web Audio 音效），强烈建议站主在真机 / 微信内置浏览器跑两局完整联机回归** —— 承接 6-23 P2#3。今日新增三块需重点回归：① **联机终局对方看到最后一手桌面**（`0fcd7ed` mp19）——是不是真有 `END_ROUND_DELAY_MS` 的停顿能看到最后一手才摊牌？换帧（新一局开始）时 `_tableTimer` 是否真的被新 `_tableGen` cancel 掉、不会触发延迟摊牌打断新一局？② **调试台改 4-Tab + 字体放大 + 融合 test/quad**（`97d9c72`）——浏览器内打 `d-b-u-g` 弹出新面板，四个 Tab 切换是否顺畅？「造局面」Tab 的「发全牌型测试手牌」按钮（融合自旧 `test` 暗号）+「联机」Tab 的「启动联机四视角测试」按钮（融合自旧 `quad` 暗号）是否照旧能用？摊牌时各家剩牌真的劈两行清晰可见？③ **Web Audio 合成音效**（`7d9197a`）——出牌 / 炸弹 / 不出 / 发牌 / 倒计时 / 结算六类音效是否听起来舒服不刺耳？静音按钮 `🔊/🔇` 是否真的全局生效且 localStorage 跨刷新保留？iOS Safari / Android Chrome / 微信内置浏览器三端 AudioContext 是否都能首次交互后正确建？沙箱无浏览器/音频出口无法替代真机回归。
5. **宠物中心发布前整改共 4 commit 21 条修复（Quick Wins 14 + P0 7 + 体重模块升级），需要在多浏览器/多设备验收**（新今日）—— pet 4 commit 全部 `bb21dde / 2d2a1ea / 1b13c0e / 977e79d` 围绕「发布前整改」展开，改动跨 `_includes/toolbox/pet/{board,modals}.html` + `_includes/cat-soundboard.html` + `assets/css/{main,pet}.css` + `assets/js/pet.js` 五条线，涉及深色模式 CSS 变量、移动端触摸目标、prefers-reduced-motion、iOS 输入框防缩放、Esc 关闭五个弹窗、含碗读数<空碗 mismatch 引导、删作差链中间称重撤销、`pullSharedPets` 多端合并去重、宠物码失效后端 auto-del、体重趋势图虚线/范围带/悬停读数等。**建议站主在 iPhone Safari + Android Chrome + 桌面 Chrome + 桌面 Firefox 至少四个组合下，过一遍真宠物中心 board** —— 加 1 条体重 + 加 1 条饮食 + 触发一次 mismatch + 切深色模式 + 切 prefers-reduced-motion + 离线刷新 + 多端共享 + 撤销作差链 + Esc 关闭所有弹窗。沙箱无 GUI / 无真触屏，确确实实跑不了。
6. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 6-17 `008ff4f` 落地 74 首安全改善后剩余的「英文歌 / 翻唱抓错 CD / ASR 漂移」等问题首站主可继续推进。属内容修复决策（承接自 6-18 / 6-19 / 6-20 / 6-21 / 6-22 / 6-23）。
7. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 / 6-15 / 6-22 / 6-23）—— `centretax.net` / `offcampus.psu.edu` / `www.hwdrivingschool.com` / `www.judicialinformation.com` / `www.textile-outlook.com`。今日 DOW=3 未跑 `dead_links.py`，下个周一（6-29）会再次扫到；属沙箱无 DNS 出口的已知现象，需站主在生产 / 本机复验。
8. **`dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间字符串误判为外链**（沿用 6-08 / 6-22）—— audit 脚本 cosmetic（6-10 已有 SKIP_URL_PATTERNS 但仍偶发命中）；非阻塞。
9. **抽检 6/10 `_notes/tutoring/math-thinking.md` 仅 48 行 / 1.1 KB，但有 `pdf_url`，正文 0 字 + 无 summary** —— `_notes/study/`-外（属 `tutoring/`），permalink `/notes/tutoring/math-thinking` 渲染需依赖 PDF 内嵌兜底。建议日后老文盘扫一并补 `summary` 字段；当下不影响功能。

### 🗂 仓库卫生

**仓库结构较昨日有显著新增但全部合规**——11 个新 commit 涉及五条主线，新增文件全部位于既有目录树/约定下：① **新增三份 LaTeX 讲义 PDF + 对应 source 树**：`files/linear-algebra/linear-algebra-strang.pdf` (894 KB) + `files/linear-algebra/source-strang/` (15 文件、4015 行 LaTeX) / `files/mao-thought/mao-thought-principles.pdf` (846 KB) + `files/mao-thought/source/mao-thought-principles.tex` (1320 行) + `files/mao-thought/source/fig-deng-lilun.png` (367 KB 配图) / `files/marxism/source/marxism-principles.tex` (1317 行) + `files/marxism/marxism-principles.pdf` (456 KB)，三份 PDF 都 <1 MB、`images.py` 未报、`material_type_enum` 全在枚举内（Notes）。② **新增三份 .md 笔记**：`_notes/study/linear-algebra/linear-algebra-strang.md` (16 行) + `_notes/study/mao-thought/mao-thought-principles.md` (21 行)；外加 `_notes/study/marxism/marxism-principles.md` 由 536 行掏空版重写为 20 行 PDF-only 导语（旧版的「被掏空的半版正文」由 LaTeX 重新铺回）。③ **pet 多文件改动**：`_includes/toolbox/pet/{board,modals}.html` + `_includes/cat-soundboard.html` + `assets/css/{main,pet}.css` + `assets/js/pet.js` 共 5 文件、+316/-87 行，无新文件、无新依赖。④ **guandan 改动**：`assets/js/games/guandan.js` 累计 +294/-66 + `toolbox/guandan/index.html` 缓存戳 bump 4 次，无新文件。⑤ **新增 1 张配图**：`files/images/marxism-principles/01.jpg` 教材封面（旧版引用就在那、文件存在）。工作树纯净（`git status` clean、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、无副本文件 / 密钥 / 凭证 / 个人路径痕迹）。LaTeX source 目录（`files/*/source*/`）按既有约定不进 `_config.yml` exclude（要进站让人下载源码）；`images.py` 未对新 PDF/PNG 报体积告警。`_config.yml` 的 `exclude:` 列表已含 `DAILY_REVIEW.md`、`EMAIL_SUMMARY.md`、`SPOTCHECK_*`、`TOOLBOX_AUDIT_REPORT.md`、`docs/`、`scripts/`、`tools/`、`_paid/`、`audio/`、`backends/`、`.claude/`、`.githooks/` 等所有内部目录与产物。**新增大体积文件总计**：1.61 MB PDF + 367 KB PNG = 1.97 MB 一次性入库；属内容资产合理增长（讲义本体）。**结论**：仓库目录基线扩展但结构合规，新增 5 个文件夹/12 个文件全部归位，无可优化空间，跳过结构调整。

### 🔬 抽检专项

**抽检 1/10 · `game` · `toolbox/countdown/index.html`**（971 行 / 34.8 KB inline，倒计时面板）
- 已修复：无。
- 一致性 ✅：inline-only（无独立 .js/.css）；与 6-23 抽检的 `toolbox/vocab/index.html`（995 行）/ 6-22 的 `toolbox/vision/index.html`（1935 行）同 pattern——单文件小工具，无需拆分。
- 长期建议：971 行刚好在 1000 行拆分阈值下，无须动；倒计时纯单人小工具，无须接入排行榜/催更/评论。

**抽检 2/10 · `pdf_archive` · `files/adv-macro-psu/chapters/ch10.pdf`**（302.1 KB · 6-13 / 6-19 / 6-22 / 6-23 同性质重复抽样）
- 已修复：无。
- 归属 ✅：被英文学术主页 `index.html:616` 区域唯一引用（adv-macro-psu 章节切片，与 ch1.pdf / ch5.pdf / ch6.pdf 一致），是英文版讲义章节切片之一。
- 体积合理性：302 KB < 5 MB；章节切片合理。
- LaTeX 化潜力：低——章节级讲义切片，整本 `adv-macro-psu-2026.md` 已 lecture_note_full（如有），章节 PDF 维持下载入口即可。

**抽检 3/10 · `lecture_note_pdf_only` · `_notes/study/causal-inference/final-2023.md`**（17 行 / 1.5 KB · 2023 因果推断期末）
- 已修复：无。
- 一致性 ✅：`pdf_url: "/files/causal-inference/final-2023.pdf"` 路径有效；front-matter 完整（layout/main_category/sub_category=因果推断与商业应用/course/material_type=Exams/date=2023-09-01/author=Zircon/discipline=经济学/permalink=/notes/causal-inference/final-2023）；summary 介绍清晰、keywords 覆盖中英文术语。
- LaTeX 化建议：③ 维持 PDF 存档即可——单次期末真题无更新需求。

**抽检 4/10 · `lecture_note_pdf_only` · `_notes/study/interm-metrics/interm-metrics-2023.md`**（17 行 / 1.3 KB · 中级计量讲义）
- 已修复：无。
- 一致性 ✅：`pdf_url: "/files/interm-metrics/interm-metrics-2023.pdf"` 路径有效；front-matter 完整。**注意**：与 P1#1 关联——`interm-metrics` 在 `study_order` 内可渲染；同期的 `interm-econometrics-2023.md`（在另一目录）因目录缺 `study_order` 不渲染，两者命名混淆是 P1#1 的根因。
- LaTeX 化建议：③ 维持 PDF 存档即可。

**抽检 5/10 · `note`（课程测评 · 心理统计Ⅱ）· `_notes/course-reviews/psy-stat-2-review-2023.md`**（64 行 / 10.2 KB）
- 已修复：无。
- front-matter ✅：title「（个人向）心理统计Ⅱ课程测评」/ sub_category=心理统计Ⅱ / discipline=心理学 / material_type=课程测评 / review_category=经济学（看似不对——课程测评模板按 review_category 分组渲染到「经济学」组下，但心理统计Ⅱ其实属于心理学；不过这是模板约定的早期归类，与现状一致，**属老分类风格，不影响渲染**）；keywords 覆盖核心搜索词。
- 内容观感 ✅：64 行五段式结构清晰；段落组织合理；选课建议具体。

**抽检 6/10 · `note`（数学基础思维 · tutoring）· `_notes/tutoring/math-thinking.md`**（48 行 / 1.1 KB）
- 已修复：无。
- 一致性 ⚠️：`pdf_url: /files/tutoring/math-thinking/Main.pdf`（典型 `tutoring/` 主文件 Main.pdf 命名约定），permalink `/notes/tutoring/math-thinking`；正文 0 字、无 `summary` 字段（注：`tutoring/` 目录是 `EVERGREEN_DIRS` 之一，`filename_convention.py` 不报）。**长期建议**：日后做老文盘扫可补 `summary`，让 PDF 内嵌前页有客观介绍（详见 P2#9）。

**抽检 7/10 · `note`（生活之问 · 音感的光谱）· `_notes/life/pitch-perception.md`**（324 行 / 24.2 KB）
- 已修复：无。
- front-matter ✅：title 长且具体「为什么有人能记住歌的原调，有人记不住？——音感的光谱」/ sub_category=生活之问 / date=2026-05-03 / permalink=/life/pitch-perception。
- 内容观感 ✅：324 行长文，五段式结构（绝对音感/相对音感/记调的几种模式/天赋与训练/光谱式定位），调性自然；属「生活之问」典范长文。

**抽检 8/10 · `lecture_note_full` · `_notes/study/causal-id/causal-id-2023.md`**（18 行 / 1.4 KB · 计量因果识别方法）
- 已修复：无。
- 一致性 ✅：`pdf_url: "/files/causal-id/causal-id-2023.pdf"` 路径有效；material_type=Notes、discipline=经济学、permalink=/notes/causal-id/causal-id-2023；keywords 覆盖核心搜索词。
- 长期建议：日后老文盘扫可补 worked example 段落（属于 lecture_note_full 标杆，但当前形态偏 PDF-only 风格）。

**抽检 9/10 · `note`（生活之问 · 饮用水）· `_notes/life/drinking-water-types.md`**（268 行 / 22.0 KB）
- 已修复：无。
- front-matter ✅：title 长且具体「日常能喝到的水都有什么区别？……」/ sub_category=生活之问 / date=2026-05-27 / permalink=/life/drinking-water-types。
- 内容观感 ✅：268 行五段式（七种水的来源对照/口感/价格/适用场景/选购建议），调性自然；与 6-23 抽检的 `_notes/life/us-tax-basics-for-students.md` 同属「生活攻略 · 生活之问」典范长文。

**抽检 10/10 · `lecture_note_pdf_only` · `_notes/study/psy-stat-I/demo-summary.md`**（17 行 / 1.2 KB · 心统Ⅰ代码总结）
- 已修复：无。
- 一致性 ✅：`pdf_url: "/files/psy-stat-I/demo-summary.pdf"` 路径有效；front-matter 完整。**注意**：该 PDF 在 `filename_convention.py` 的 `ACCEPTED_UNDATED` 白名单内（与今日新增的三份讲义同类），符合既有约定。
- LaTeX 化建议：③ 维持 PDF 存档即可——代码总结一次性资料。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点本次 `backend_pulse.py` 仍全报 HTTP 403。与 5-27 ~ 6-23 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。**今日 11 个 commit 涵盖前端（pet/guandan/notes）但无后端改动**，三件套无新增依赖。

---

## 2026-06-23

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项；今日周二 DOW=2，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=23，未跑 monthly_stats）。距 6-22 巡检共 **4 个 commit**（`a19f510` 之后 → `2a62c39` 为止），全部围绕**掼蛋调试链路**展开、依旧锁在「assets/js/games/guandan.js + guandan-dmc.js + toolbox/guandan/index.html + scripts/sim-guandan.js + docs/guandan-debug-console.md」5 个文件内：① `522c0ac` 头像与玩家绑死（mp18）——新增 `playerAvatarOf(p, isMe)` 与 `GD_AVATAR_POOL = ['🦊','🐯','🐼','🐱','🐸','🦁','🐵','🐶','🐰','🐷','🐮','🐔']`（12 槽稳定头像池），本人恒 😎、AI 恒 🤖、其余真人按服务端稳定下标 `p.avatar` 取池中固定 emoji，与座位脱钩；旧的 `LOBBY_AI_ICONS = ['🤖','🦊','🤝','🐱']` 按座位映射保留但注释标注「已弃用」；大厅 + 牌桌共用同一套 `seatAvatarFor` → `playerAvatarOf`——`mp17` 大厅换座重做之后留下的「玩家被房主移走头像就变脸」副作用被收口（共 `+252 / -12` 行，新建 26 个常量/方法但都聚焦头像绑定一条线）。② `e0e283a` 补齐调试台 AI 透视镜的 DMC 出口（dbgxray）——`guandan-dmc.js` 的 `choose(...)` 新增可选 `dbgOut` 参数，DMC 神经网络分支逐手 `push({cards,type,len,score,pass})`（每手的网络 Q 值），调试台 hard 难度档位现在也能看到 AI 为什么挑这手；缓存版本号 `guandan-dmc.js?v=20260616int8 → 20260622dbgxray` 同步更新（与既有 easy/normal 启发式分支的透视镜出口对齐，调试台 4 块功能补全）。③ `cccfd79` 加 regress 子命令——`scripts/sim-guandan.js regress <候选.json> [N=400] [基线.json|DEFAULT_W] [seed=20260622]` 固定种子下让候选 vs 基线两套权重各坐一对（南北/东西），打 N 副（默认 400），输出对拍胜率 + 95 % 置信区间，给 AI 改动自动体检；纯命令行工具不进 ship 路径。④ `2a62c39` 文档化整套调试台 → 新增 `docs/guandan-debug-console.md`（101 行），讲清浏览器调试台暗号 `dbug` 触发 + 4 块功能（固定牌局种子 / 节奏单步快进 / AI 透视镜 / 局面注入）+ 命令行 `regress` 用法 + 安全性（种子默认 null = 真随机、节奏默认 run、透视默认关，不开面板完全等于改前行为，可安心躺 `main`）；`_config.yml exclude:` 已含 `docs/`，**已验证 `_site/docs/` 不存在 / `_site` 无 `guandan-debug-console*` 任何文件**——内部文档零进站。**0 文章内容 / 0 信息架构 / 0 站点 IA / 0 其它工具改动**——4 个 commit 全部聚焦掼蛋调试链路收尾。`bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（14.854 s，cold build）。今日 `scripts/audit/run.sh` 全套审计 **13/13 每日项全 clean**——`keywords_coverage`（散文 121 篇全部充足，与 6-22 完全一致）/ `images`（仅 `files/interm-macro/interm-macro-2022-zh.pdf` 2.13 MB 大文件，承接 6-16 中文版讲义首发，markdown 入口正常，与 6-16 ~ 6-22 同）/ `material_type_enum`（分布完全无变化：Notes ×44 / Exams ×40 / 课程测评 ×18 / 经验之谈 ×5 / 错题本 ×3 / 写作 ×2 / 口语 ×1 / 词汇 ×1，承接 6-22）/ `filename_convention` / `hover_no_media`（4 commit 全部锁 guandan，无 `:hover` 新增，但抽检 1/10 vocab + 9/10 pitch 两个 game 全 hover 复审 ✅）/ `sibling_crosslink`（9 个 ≥3 篇 sub_category 组全互链）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检见下）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-22，沙箱无 fly.io 出口）。**今日 0 项自动修复**——4 个 commit 全部合规、所有审计 clean、抽检 10 项无新增问题。**P1 队列**：仅 `study_order` 未列 `interm-econometrics` 一条 P1 仍有效（承接 6-13 至 6-22 共 10 日），今日核对 `ls _notes/study/` 共 24 个目录、`_config.yml` `study_order` 共 23 条，`comm -23` 唯一差集仍是 `interm-econometrics`，与 6-22 / 6-21 / 6-20 核对完全一致。

### ✅ 本次已自动修复

无。

4 个 commit 全部锁在 `assets/js/games/guandan.js` + `assets/js/games/guandan-dmc.js` + `toolbox/guandan/index.html` + `scripts/sim-guandan.js` + `docs/guandan-debug-console.md` 五个文件内，无文章内容 / 信息架构 / 搜索 / 样式 / 配置 / front-matter 改动。所有审计项 clean、抽检 10 项无新增可自动处理项，**无需任何修复**。今日唯一动作是更新本 DAILY_REVIEW.md 文档。

### 📋 待你把关

#### P0（紧急）
无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 / 6-14 / 6-15 / 6-16 / 6-17 / 6-18 / 6-19 / 6-20 / 6-21 / 6-22，第 11 日承接）。`/notes/` landing 渲染遍历的就是 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、与同名旧版 `interm-metrics-2023.md` 同名相近但目录不同）这篇在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日复核：`ls _notes/study/` 共 24 个目录，`study_order` 共 23 条，`comm -23` 唯一差集即 `interm-econometrics`；`_notes/study/interm-econometrics/interm-econometrics-2023.md` 是 16 行 front-matter + 1 行的 PDF-only 笔记，summary 充分（120 页 Wooldridge 体系完整讲义、覆盖 OLS / 推断 / 渐进 / 异方差 / 面板 / IV-2SLS）、keywords ×97 极厚足。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）属设计判断，仍请你拍板。

#### P2（建议）

1. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接自 6-03。功能正确，纯排版风格小差异，可忽略。
2. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接自 6-03。已有「同课程自动侧栏」覆盖（`sibling_crosslink.py` ✅）但缺手写互链段落引导。属内容写作决策。
3. **掼蛋 6-18 ~ 6-22 期间联机改造收尾共 19 个 commit（结算闩 / SSE / 倒计时 / 四视角测试 / 逐家亮牌节奏 / 服务端 trail 步进重构 / 进贡还贡演出 / 大厅换座重做 / 头像绑死 / 调试台 dbug + DMC 透视镜 + regress 子命令 + docs 调试台说明），强烈建议站主在真机 / 微信内置浏览器跑两局完整联机回归** —— 承接 6-22 P2#3。今日新增三块需重点回归（在 mp17 大厅换座基础上）：① **`mp18` 头像与玩家绑死**——大厅换座后是否真的不再变脸？被房主移到新座的玩家头像保持原状？多人同时在线时不同玩家看到对方头像一致？沙箱无法替代真机回归。② **调试台 `dbug` 暗号 + 4 块功能**——浏览器内打 `d-b-u-g` 四字母弹出面板、再打一次收起；固定种子下 AI 是否走相同步？「单步」按钮是否真的暂停 AI？AI 透视镜在 easy / normal / hard 三档都能看到每手候选 + 评分？局面注入「替换该家手牌」+「导入局面」自动续跑？沙箱无浏览器无法验证。③ **命令行 `regress` 体检**——`node scripts/sim-guandan.js regress <候选.json> 100` 是否真的固定种子复现？输出胜率 + 置信区间符合预期？请在改 AI 权重后跑一遍验收。
4. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 6-17 `008ff4f` 落地 74 首安全改善后剩余的「英文歌 / 翻唱抓错 CD / ASR 漂移」等问题首站主可继续推进。属内容修复决策（承接自 6-18 / 6-19 / 6-20 / 6-21 / 6-22）。
5. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 / 6-15 / 6-22）—— `centretax.net` / `offcampus.psu.edu` / `www.hwdrivingschool.com` / `www.judicialinformation.com` / `www.textile-outlook.com`。今日 DOW=2 未跑 `dead_links.py`，下个周一（6-29）会再次扫到；属沙箱无 DNS 出口的已知现象，需站主在生产 / 本机复验。
6. **`dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间字符串误判为外链**（沿用 6-08 / 6-22）—— audit 脚本 cosmetic，建议日后扫脚本启发式时一并加 `^https?://(www\.)?w3\.org/(\d{4}/(xlink|svg)|graphics/SVG)` 跳过规则。**改 audit 脚本而非内容**，承接 6-05 起的 audit 脚本启发式队列。
7. **抽检 9/10 `_notes/toefl/toefl-templates-2023.md` 老分享前置 cosmetic** —— 承接 6-22 P2#7。34 行短笔记缺 `summary` / `permalink` / `author` 三字段（Jekyll 走默认 permalink 也能渲染、build clean、`frontmatter_yaml.py` 不报错），属早期写作标准。今日抽检 8/10 `toefl-first-attempt.md` 同样仅 11 行 front-matter（无 `summary` / `permalink` / `author`，但 42 行散文正文 + keywords ×18 充足），属同期写作风格。日后做老文盘扫可一并补齐；当下不影响任何对外功能。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化。** 4 个新 commit 全部锁在 `assets/js/games/guandan.js`（+252 / -12）+ `assets/js/games/guandan-dmc.js`（+12 / -3）+ `toolbox/guandan/index.html`（+1 / -1，仅缓存版本号）+ `scripts/sim-guandan.js`（+87 / -5）+ `docs/guandan-debug-console.md`（+101 / 新文件）五个文件，未引入新顶级目录 / 新顶级文件 / 新依赖 / 新二进制。工作树纯净（`git status` clean、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、无副本文件 / 密钥 / 凭证 / 个人路径痕迹）。**新增的 `docs/guandan-debug-console.md` 是站主内部维护文档**，`_config.yml` exclude 已含 `docs/` → **复核 `_site/docs/` 不存在 / `_site` 无 `guandan-debug-console*` 任何文件**，零进站验证通过。`_config.yml` 的 `exclude:` 列表已含 `DAILY_REVIEW.md`、`EMAIL_SUMMARY.md`、`SPOTCHECK_100_REPORT.md`、`SPOTCHECK_100_AGENT_REPORTS.md`、`TOOLBOX_AUDIT_REPORT.md`、`docs/`、`scripts/`、`tools/`、`_paid/`、`audio/`、`backends/`、`.claude/`、`.githooks/` 等所有内部目录与产物（grep 已核对）。`.gitignore` 状态未变。**结论**：与 6-15 / 6-16 / 6-17 / 6-18 / 6-19 / 6-20 / 6-21 / 6-22 同——仓库目录基线稳定，无可优化空间，跳过结构调整。

### 🔬 抽检专项

**抽检 1/10 · `game` · `toolbox/vocab/index.html`**（995 行 / 35.5 KB inline，间隔重复生词本）
- 已修复：无。
- 一致性 ✅：front-matter 完整（layout=default / title / permalink=/toolbox/vocab/），8 处 `:hover` 全部 `@media (hover: hover)` 守卫（L52 / L160 / L167 / L215 / L235 / L276 / L348 共 7 块 media query；`hover_no_media.py` clean 印证）；inline-only 与站内其它生活向小工具同 pattern。
- 长期建议：995 行接近 >1000 行拆分阈值但尚未越线，与 6-22 抽检的 `toolbox/connect4/index.html`（964 行）规模相当，维持现状即可。**间隔重复算法（spaced repetition）是单人小工具**，无须接入排行榜 / 催更 / 评论，本结论与设计意图一致。

**抽检 2/10 · `pdf_archive` · `files/corp-fin/mid-2020-en.pdf`**（201.3 KB）
- 已修复：无。
- 归属 ✅：被 `_notes/study/corp-fin/mid-2020-en.md` 唯一引用 `pdf_url: "/files/corp-fin/mid-2020-en.pdf"`，路径一致；与同年中文卷 `mid-2020-zh.md` 配对，summary 「光华本科《公司财务管理》2020 年期中真题（英文卷）。考点覆盖现金流折现、NPV/IRR 决策、资本结构与 MM 定理；与同年中文卷题型一致，可作为英文教材课对照练习」清晰；keywords ×24 厚足（含「公司财物 期中 2020」错别字兜底 + "midterm 2020 corporate finance English"）。
- 体积合理性：201 KB < 5 MB，未列入 `EXEMPT_FILES`、`images.py` 未报。
- LaTeX 化潜力：低——本科课程一次性应试材料无更新需求，建议维持 PDF 存档。

**抽检 3/10 · `lecture_note_pdf_only` · `_notes/study/adv-micro-psu/2025-midterm-1.md`**（16 行 / 1.3 KB，PDF-only 存档）
- 已修复：无。
- 一致性 ✅：`pdf_url: "/files/adv-micro-psu/2025-midterm-1.pdf"`（54 KB 实存）路径有效；front-matter 完整（layout/main_category/sub_category=高级微观经济学（PSU）/course/material_type=Exams/date=2025-02-18/author=Zircon/discipline=经济学/permalink=/notes/adv-micro-psu/2025-midterm-1/keywords ×29 厚足覆盖中英文术语「高微 PSU 期中」/「advanced microeconomics midterm PSU」/「consumer theory 期中」/「Walrasian equilibrium 真题」/「Pareto 最优 试题」/「PSU micro 春季 期中」等）；summary「PSU 经济 PhD 一年级高级微观经济学 2025 春第一次期中考试真题原卷。覆盖消费者理论、一般均衡等核心内容，跟 Midterm 2 系列形成完整一学期真题库」介绍清晰。
- LaTeX 化建议：③ 维持 PDF 存档即可——单次期中真题原卷无更新需求，与 6-21 抽检的 `adv-micro-psu/chapters/ch1.pdf` 同性质。
- 关联性 ✅：与 `2025-midterm-2.md` / `2026-midterm-1.md` / `2026-midterm-2.md` / `2025-final.md` / `2026-final.md` 同课程多年度真题库串读完整。

**抽检 4/10 · `pdf_archive` · `files/gre/GRE-Verbal-Passages-Ans.pdf`**（209.7 KB）
- 已修复：无。
- 归属 ✅：被 `_notes/gre/gre-exam-ui-notebook.md:322` 引用「PDF 题面版 · PDF 答案版 · .tex 源 · .sty 模板」四件套；本身就是 LaTeX 编译输出（`/files/gre/source/verbal-passages/GRE-Verbal-Passages.tex` 已存源码），无须再 LaTeX 化。
- 体积合理性：209 KB < 5 MB。
- 命名 ✅：`-Ans.pdf` 后缀与同目录 `GRE-Verbal-Passages.pdf` 题面版配对，符合命名约定。

**抽检 5/10 · `pdf_archive` · `files/adv-micro-psu/chapters/ch1.pdf`**（118.8 KB）
- 已修复：无。
- 归属 ✅：被英文学术主页 `index.html:616` 唯一引用 `<li><a href="/files/adv-micro-psu/chapters/ch1.pdf">Ch 1: Game Representation</a></li>`，是英文版讲义章节切片之一（与 6-22 抽检的 `adv-micro-psu/chapters/ch5.pdf`、6-19 抽检的 `adv-micro-pku/chapters/ch6.pdf` 同 pattern）。
- 体积合理性：118 KB < 5 MB，章节切片合理。
- LaTeX 化潜力：低——章节级讲义切片，整本 `adv-micro-psu-2026.md` 已是 lecture_note_full（148 行 keywords ×33），章节 PDF 维持下载入口即可。

**抽检 6/10 · `note`（课程测评 · 网球）· `_notes/course-reviews/tennis-review-2023.md`**（81 行 / 9.6 KB）
- 已修复：无。
- front-matter ✅：title「（个人向）网球课程测评」/ sub_category=网球 / discipline=体育 / material_type=课程测评 / course=网球 / review_category=体育 / semester=2023 春 / keywords ×15 覆盖核心搜索词（"北大网球课" / "戴名辉老师" / "网球零基础" / "tennis class" / "球类体育课" / "正手反手" / "网球技术考核" / "二体网球场" / "五四网球场" / "体测" / "12 分钟跑" / "选课参考" / "网球入门" / "网求课" 错别字）。
- 内容观感 ✅：81 行五段式结构清晰（缘由 → 教学内容 → 期末考核 → 体测 → 选课建议）；段落组织合理、调性自然、戴名辉老师评价具体；对零基础同学 / 体测 / 课程难度做了实用提示。
- 长期建议：无——属课程测评专栏短文典范。

**抽检 7/10 · `note`（生活攻略 · 留学攻略 · 美国报税三部曲第一篇）· `_notes/life/us-tax-basics-for-students.md`**（383 行 / 16.9 KB）
- 已修复：无。
- front-matter ✅：title「美国报税完全指南（一）：留学生税务身份与基础术语」/ sub_category=留学攻略 / permalink=/life/us-tax-basics-for-students / last_reviewed=2026-05-26 / keywords ×23 覆盖核心搜索词（"美国报税" / "留学生报税" / "税务身份" / "tax return" / "1040NR" / "Form 8843" / "W-2" / "1042-S" / "1098-T" / "NRA" / "resident alien" / "5 年规则" / "中美税务协议" / "tax treaty" / "FICA" / "Social Security 税" / "Sprintax" / "F-1 报税" / "没收入报税"）。
- 内容观感 ✅：383 行 11 章结构齐全（这篇给谁看 → 结论先行 → 3 大税务身份 → 5-year rule + SPT → 6 张必填表格 → 中美税务协议 Article 20 \$5K → FICA 豁免追回 → State Tax → 截止日期 → 反直觉常识 → 参考来源），第三方资源 7 条（IRS 官方 / Pub 519 / Pub 901 / PSU Global / 一亩三分地 / Sprintax）。免责声明（§1 ⚠️ 框）正确标明「入门解读 + 风险警示，不是法律 / 税务建议」、引用前请核对当年最新数。
- 数学公式 LaTeX ✅：SPT 公式 `\frac{1}{3}` `\frac{1}{6}` `\geq 183` 等都用 `$$...$$`；州税率 `$1\text{-}13.3\%$` 等用 inline `$...$`；与 [feedback_latex_formulas] 一致。
- 标点 ✅：` \$5,000` ` \$15,000` ` \$25,000` 等金额都做了 backslash 转义（避免 KaTeX 把后续 `$` 当公式启始）。
- 长期建议：无——属留学攻略专栏典范长文，第二篇 `us-tax-filing-process` 与第三篇 `us-tax-longterm-planning` 已串读引用。

**抽检 8/10 · `note`（TOEFL · 经验之谈）· `_notes/toefl/toefl-first-attempt.md`**（42 行 / 8 KB）
- 已修复：无。
- front-matter ⚠️：title「不配这个专栏的托福经验分享」/ sub_category=TOEFL / discipline=语言考试 / course=TOEFL / material_type=经验之谈 / keywords ×18 覆盖核心搜索词（"托福 经验分享" / "TOEFL 备考" / "托福 一战" / "托福 裸考" / "托福 词汇量" / "托福背单词 无用" / "托福 口语 准备" / "TOEFL first attempt" / "toeflresources" / "交换 语言成绩" / "本科生 托福"）。**缺字段**：与 `toefl-templates-2023.md` 同样**缺 `summary` / `permalink` / `author`** 三字段（早期 2023-02 写作风格，Jekyll 走默认 `/notes/:path/` permalink 仍可渲染、`frontmatter_yaml.py` 不报错）。
- 内容观感 ✅：42 行散文五段式（报名经历 → 词汇量 → 口语 → 写作 → 听力 → 阅读 → 资源），调性自然、文笔流畅、链接 `toeflresources.com`（亲测可直接访问，承接 §1 风险已知现象）；尾巴 link 到 `toefl-second-attempt`「半年后又有了一篇」串读完整。
- 长期建议：日后做老文盘扫可补齐 `summary` / `permalink` / `author` 三字段（与 6-22 P2#7 同延），与 `toefl-templates-2023.md` 同批处理；当下不影响任何对外功能。

**抽检 9/10 · `game` · `toolbox/pitch/index.html`**（1107 行 / 37.9 KB inline，音高测量）
- 已修复：无。
- 一致性 ✅：front-matter 完整（layout=default / title / permalink=/toolbox/pitch/），3 处 `:hover` 全部 `@media (hover: hover)` 守卫（L50 / L152 / L241 三块 media query 包裹；`hover_no_media.py` clean 印证）；inline-only。
- 长期建议：1107 行已越过 >1000 行拆分阈值（与 6-22 抽检的 `toolbox/vision/index.html` 1935 行 / 6-21 抽检的 `toolbox/doudizhu/index.html` 2399 行 / 6-19 抽检的 `chess/index.html` 1986 行同性质——站内大型 inline 工具普遍超阈值，是建设期的可接受历史包袱）。音高测量属可选生活工具，长期可参考 6-04 `d85c349` pet 拆分模式，属架构决策，需站主拍板。

**抽检 10/10 · `pdf_archive` · `files/china-hist/china-hist-2024.pdf`**（1.7 MB · 与 6-22 抽检 8/10 重复同抽样）
- 已修复：无。
- 一致性 ✅（与 6-22 抽检结论完全一致）：`pdf_url: "/files/china-hist/china-hist-2024.pdf"` 被 `_notes/study/china-hist/china-hist-2024.md` 唯一引用，路径有效；front-matter 完整（layout/main_category=学习资料/sub_category=中国古代文化/course/material_type=Notes/date=2024-09-01/author=Zircon/discipline=通识/keywords ×26 厚足覆盖中英文术语 + 错别字「中国古代文话」+ "PKU" / "北大 通识" / "诸子百家" / "宋明理学" / "科举 制度"等核心搜索词）；summary 介绍清晰。
- LaTeX 化建议：③ 维持 PDF 存档即可——通识课课堂笔记 1.8 MB 量级合理，PDF 形态满足搜索 + PDF 内嵌预览即可。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点本次 `backend_pulse.py` 仍全报 HTTP 403。与 5-27 ~ 6-22 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。**今日 4 个 commit 全部前端 / 调试链路**（assets/js/games/guandan.js + guandan-dmc.js + toolbox/guandan/index.html + scripts/sim-guandan.js + docs/guandan-debug-console.md），后端无新增依赖。

---

## 2026-06-22

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（16 项；今日周一 DOW=1，**加跑 dead_links / orphan_files / pii_scan 三项周一项**；DOM=22，未跑 monthly_stats）。距 6-21 巡检共 **5 个 commit**（`7044400` 之后 → `50bd8bd` 为止），仍是单线**掼蛋（guandan）联机改造收尾的下一波**，全部锁在 `assets/js/games/guandan.js` + `toolbox/guandan/index.html` 两文件：① `b67a4a8` 四家出牌区更贴菱形——把左右两家的竖向中点上移（手机横屏 42→38 %、桌面/其它 35→31 %），对家（顶）与自己（底·出牌带）位置不变，纯内联 CSS，仅联机牌桌布局生效。② `1b57a5d` 逐家亮牌改随机间隔（仿单机 ~300-580 ms · mp14）——上一版固定 100 ms 像瞬间/机械，改成随机思考时长（仿单机 `scheduleAI` 的 `360+rand*320`），有「真打牌的呼吸感」。③ `85bb74a` 联机同步重构——服务端步进 trail + 客户端逐帧回放（mp15，根因级重做）：服务端把一次提交后自动跑完的多步（别家出牌/不出/收圈/新领出）原本并到同一次 version bump，客户端只拿到最终态——看不到别人「不出」、看不到收圈清桌、AI 像瞬间出牌；旧客户端「逐家亮牌」靠对比上下帧 `lastPlay` 重建，根本拿不到被覆盖掉的中间态（如收圈前的不出），无法修。改为客户端读 `gv.trail`（服务端逐帧记的步进快照，已在 `rotateGvToSelf` 旋成自视角），按随机间隔 ~300-580 ms 逐帧回放——第一帧立即上（动作低延迟），其余按节奏。每帧自包含 `lastPlay/counts/turn/out/jiefeng`，所以收圈前的「不出」「赢牌」「清桌」「新领出」都看得到。炸弹/接风按帧放特效（`_bombFxKey/seq` 去重），`_tableGen` 代际 + `isNetworked` 守卫保证新帧/离线/换局自愈，`trailCounter` 每局重数→客户端按「收到更小 tseq」复位游标。`round_end/tribute/测试模式` 仍即时铺好。删掉旧的 `_revealSeats/_isTrickClear` 客户端重建逻辑。决策逻辑过 9/9 自测。④ `5fbe9ec` 联机进贡/还贡看得见——服务端记交换事件，客户端正式出牌前演一遍（mp16）：修「联机看不到进贡还贡过程、直接进出牌阶段」（用户报告）。服务端 `executeTributeSwaps` 记下刚完成的交换（实际两张牌，`tributeReveal.kind='swap'.pairs`），抗贡则记 `kind='resist'.seats`；`viewForSeat` 下发。客户端旋成自视角后，在该局第一帧出牌前先演一遍——交换：把进贡牌（进）/还贡牌（还）摆进各自出牌区停留 ~1.9 s；抗贡：弹「🛡️ 抗贡成功」横幅。按内容签名去重（演完才记，保证 POST+SSE 双帧只完整演一次），`_tableGen` 守卫自愈。复用既有 `tributeLabel` 出牌区渲染，不碰手牌（权威态）。引擎纯新增记录，自测 2218 / 4958 / 26 全绿。⑤ `50bd8bd` 大厅换座重做——点头像选人 → 点空座移动 + 大厅不旋转(锚点) + 开局转到自己在底部的动画（mp17）：按用户要求重做联机大厅换座。点头像→点空座移动：房主点某玩家头像选中（金边），再点一个空座 → 把那个玩家移过去（含移房主自己，走新后端 `move_seat`）；点另一个有人的头像 = 两座对调（原 swap）。空座在有选中时显示「移到这」+ 虚线金框高亮。去掉旧的「点空座就是自己过去」——现在房主移自己也要先点自己头像。非房主未落座仍可点空座初次坐下。大厅不再随当前座旋转：`displayIdxForSeat` 改用「锚点」（第一次落座记下），换座/被移动画面不旋——你能看到自己被挪到新格（右/对面/左），而不是被转回底部。每人进来仍默认看到自己在底部（锚点=初始座）。开局衔接动画：`rotateLobbyToSouth` 把四家座位从锚点朝向 FLIP 平移到「自己在底部」，再进牌桌——看到自己滑到底部而非凭空跳。兜底定时器保证对局必开。对局中渲染仍走 `rotateGvToSelf`（恒自己在底），与大厅锚点无关。共改 2 文件：`assets/js/games/guandan.js` 5 次（+272 / -88 累计）、`toolbox/guandan/index.html` 5 次（缓存版本号 mp14/mp15/mp16/mp17 + 一次菱形 CSS 微调）。**0 文章内容改动 / 0 站点 IA 改动**——5 个 commit 全部锁在 `assets/js/games/guandan.js` + `toolbox/guandan/index.html` 两个文件。`bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（12.287 s，cold build）。今日 `scripts/audit/run.sh` 全套审计 **13/13 每日项全 clean + 3/3 周一项跑完无新增问题**——`keywords_coverage`（散文 121 篇全部充足，与 6-21 完全一致）/ `images`（仅 `files/interm-macro/interm-macro-2022-zh.pdf` 2.13 MB 大文件，承接 6-16 中文版讲义首发，markdown 入口正常，与 6-16 ~ 6-21 同）/ `material_type_enum`（分布完全无变化：Notes ×44 / Exams ×40 / 课程测评 ×18 / 经验之谈 ×5 / 错题本 ×3 / 写作 ×2 / 口语 ×1 / 词汇 ×1）/ `filename_convention` / `hover_no_media`（5 次掼蛋改动后无裸 `:hover` 引入）/ `sibling_crosslink`（9 个 ≥3 篇 sub_category 组全互链）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检见下）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-21）/ `dead_links`（257 条疑似 = **253 HTTP 403** 沙箱被反爬挡 + **2 HTTP 404** `fonts.googleapis.com`/`fonts.gstatic.com` 裸根路径需 query 参数才返回 200 + **2 网络错误** 网域 DNS 解析失败；细分：28 条公众号 `mp.weixin.qq.com` 反爬挡、17 条 `cdn.jsdelivr.net` / 6 条 `cdnjs.cloudflare.com` 反爬挡、9 条 `zircon-{urge,comments}.fly.dev` 后端无出口、11 条 `www.irs.gov` / 5 条 `www.uscis.gov` / 9 条 `www.reddit.com` / 4 条 `www.ets.org` 等被反爬挡，**真正的 DNS NameResolutionError 仅 5 条**：`centretax.net` / `offcampus.psu.edu` / `www.hwdrivingschool.com` / `www.judicialinformation.com` / `www.textile-outlook.com`，与 6-15 一致 / 全部沿用 6-08 起的承接判断——沙箱出口反爬 + DNS 不全是已知现象，请站主在生产/本机复验那 5 条）/ `orphan_files`（0 孤儿 ✅）/ `pii_scan`（18 篇命中，与 6-15 / 6-08 完全一致，分布无变化——全部是已知性质：`_notes/essays/birthday-*` 与 `letter-to-*` 含三明二中是本人成长经历的必要内容，`_notes/course-reviews/*-review-2023.md` 的「疑似学号」全是公众号 URL 里 `mid=...` 参数被正则误命中，`_notes/life/us-{health-insurance-basics,postal-system-guide}.md` 的「学号」是教程里 SSN/手机号示例字符串，**不是真正的 PII 问题**）。**今日 0 项自动修复**——5 个 commit 全部合规、所有审计 clean、抽检 10 项无新增问题。**P1 队列**：仅 `study_order` 未列 `interm-econometrics` 一条 P1 仍有效（承接 6-13 至 6-21 共 9 日），今日核对 `ls _notes/study/` 共 24 个目录、`_config.yml` `study_order` 共 23 条，`comm -23` 唯一差集仍是 `interm-econometrics`，与 6-21 / 6-20 / 6-19 核对完全一致。

### ✅ 本次已自动修复

无。

5 个 commit 全部锁在 `assets/js/games/guandan.js` + `toolbox/guandan/index.html` 两个文件内，无文章内容 / 信息架构 / 搜索 / 样式 / 配置 / front-matter 改动。所有审计项 clean、抽检 10 项无新增可自动处理项，**无需任何修复**。今日唯一动作是更新本 DAILY_REVIEW.md 文档。

### 📋 待你把关

#### P0（紧急）
无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 / 6-14 / 6-15 / 6-16 / 6-17 / 6-18 / 6-19 / 6-20 / 6-21，第 10 日承接）。`/notes/` landing 渲染遍历的就是 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、与同名旧版 `interm-metrics-2023.md` 同名相近但目录不同）这篇在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 共 24 个目录，`study_order` 共 23 条，`comm -23` 唯一差集即 `interm-econometrics`。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）属设计判断，仍请你拍板。

#### P2（建议）

1. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接自 6-03。功能正确，纯排版风格小差异，可忽略。
2. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接自 6-03。已有「同课程自动侧栏」覆盖（`sibling_crosslink.py` ✅）但缺手写互链段落引导。属内容写作决策。
3. **掼蛋 6-18 ~ 6-21 期间联机改造收尾大动 15 commit（结算闩 / SSE / 倒计时 / 四视角测试 / 逐家亮牌节奏 / 服务端 trail 步进重构 / 进贡还贡演出 / 大厅换座重做），强烈建议站主在真机 / 微信内置浏览器跑两局完整联机回归** —— 承接 6-21 P2#3。今日新增三块需重点回归：① **服务端 trail 步进 + 客户端逐帧回放（mp15）**——根因级重做，是否所有联机场景（别家出牌 / 不出 / 收圈清桌 / AI 思考节奏 / 炸弹特效）都按预期一家家亮出而非一帧全弹？任何边角的「卡帧 / 重复演 / 漏演」都需要观察。② **进贡/还贡演出（mp16）**——进入新局时进贡牌、抗贡横幅是否准时演完才进出牌阶段？双帧（POST+SSE）下是否只演一遍？③ **大厅换座（mp17）**——点头像选人→点空座移动 / 房主移自己也要先点头像 / 非房主未落座可点空座初次坐下 / 大厅锚点不旋转 + 开局动画滑到底部，这些 UX 改动是否符合直觉？沙箱无浏览器无法替代真机回归。
4. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 6-17 `008ff4f` 落地 74 首安全改善后剩余的「英文歌 / 翻唱抓错 CD / ASR 漂移」等问题首站主可继续推进。属内容修复决策（承接自 6-18 / 6-19 / 6-20 / 6-21）。
5. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 / 6-15）—— `centretax.net` / `offcampus.psu.edu` / `www.hwdrivingschool.com` / `www.judicialinformation.com` / `www.textile-outlook.com`。今日周一 `dead_links.py` 仍命中这 5 条，与上次周一（6-15）同源。属沙箱无 DNS 出口的已知现象，需站主在生产 / 本机复验；若真死可换更稳的替代或把段落改"线下查询"指引。
6. **`dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间字符串误判为外链**（沿用 6-08）—— audit 脚本 cosmetic，本次 257 条疑似中没有 w3.org 命名空间被命中（脚本可能已修过 / 或本次没扫到那些 inline SVG），但建议日后扫脚本启发式时一并加 `^https?://(www\.)?w3\.org/(\d{4}/(xlink|svg)|graphics/SVG)` 跳过规则。**改 audit 脚本而非内容**，承接 6-05 起的 audit 脚本启发式队列。
7. **抽检 9/10 `_notes/toefl/toefl-templates-2023.md` 老分享前置 cosmetic** —— 承接 6-21 P2#5。34 行短笔记缺 `summary` / `permalink` / `author` 三字段（Jekyll 走默认 permalink 也能渲染、build clean、`frontmatter_yaml.py` 不报错），属早期写作标准。日后做老文盘扫可一并补齐；当下不影响任何对外功能。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化。** 5 个新 commit 全部锁在 `assets/js/games/guandan.js`（+272 / -88）+ `toolbox/guandan/index.html`（+18 / -0）两个文件，未引入新目录 / 新顶级文件 / 新依赖 / 新二进制。工作树纯净（`git status` clean、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、无副本文件 / 密钥 / 凭证 / 个人路径痕迹）。周一加跑的 `orphan_files` ✅ 0 孤儿（非课程目录 `files/{en,images,audio,podcasts}` + `audio/` 扫 477 个文件均有引用）；`pii_scan` 18 篇命中分布与上周一（6-15）完全一致，无新增。`_config.yml` 的 `exclude:` 列表已含 `DAILY_REVIEW.md`、`EMAIL_SUMMARY.md`、`SPOTCHECK_100_REPORT.md`、`SPOTCHECK_100_AGENT_REPORTS.md`、`TOOLBOX_AUDIT_REPORT.md`、`docs/`、`scripts/`、`tools/`、`_paid/`、`audio/`、`backends/`、`.claude/`、`.githooks/` 等所有内部目录与产物（grep 已核对）。`.gitignore` 状态未变。**结论**：与 6-15 / 6-16 / 6-17 / 6-18 / 6-19 / 6-20 / 6-21 同——仓库目录基线稳定，无可优化空间，跳过结构调整。

### 🔬 抽检专项

**抽检 1/10 · `game` · `toolbox/vision/index.html`**（1935 行 / 62.3 KB inline）
- 已修复：无。
- 待办：无新增。
- 长期建议：单文件 1935 行已大幅超过站主自定的 >1000 行考虑拆分阈值，与 6-21 抽检的 doudizhu 2399 行、6-19 抽检的 chess 1986 行同性质。inline-only（无独立 .js/.css），9 处 `:hover` 全部 `@media (hover: hover)` 守卫 ✅（`hover_no_media.py` clean 印证）。视力自测属可选生活工具，长期可参考 6-04 `d85c349` pet 拆分模式，属架构决策，需站主拍板。

**抽检 2/10 · `pdf_archive` · `files/corp-fin/cheat-sheet-mid-2022.pdf`**（1.3 MB · 与 6-20 抽检 2/10 重复同抽样）
- 已修复：无。
- 归属：✅ `_notes/study/corp-fin/cheat-sheet-mid-2022.md` 唯一引用 `pdf_url: "/files/corp-fin/cheat-sheet-mid-2022.pdf"`，路径一致（与 6-20 抽检结论完全相同）。
- 体积合理性：1.3 MB（cheat sheet 含密集公式 / 表格），未列入 `EXEMPT_FILES`、`images.py` 未报。
- LaTeX 化潜力：低——PKU 光华公司财务管理期中考前速查表，一次性资料无更新需求，建议维持 PDF 存档。

**抽检 3/10 · `lecture_note_pdf_only` · `_notes/study/psy-stat-II/cheat-sheet-mid-2023.md`**（17 行 / 818 B，PDF-only 存档）
- 已修复：无。
- 一致性：✅ `pdf_url: "/files/psy-stat-II/cheat-sheet-mid-2023.pdf"` 路径有效；front-matter 完整（layout/main_category/sub_category=心理统计Ⅱ/course/material_type=Exams/date=2023-09-01/author=Zircon/discipline=心理学/keywords ×6 覆盖中英文术语 + "psy stat 2 midterm cheat sheet 2023" / "高级心理统计 期中 公式" / "心里统计 期中" 错别字兜底）；summary 介绍清晰（"FA / SEM 入门 / 多元回归 / 因子分析旋转方法 等高频公式与判断准则浓缩在 A4 一张纸"）。
- 关键词 keywords 厚度：⚠️ 仅 6 条，相对于 6-15 / 6-20 抽检的 `psy-stat-I/cheat-sheet-final-2022.md` 30 条偏薄；建议日后老文盘扫时补齐到 ≥15 条（含教材名 / 教师名 / 旋转方法学名 / "varimax oblique promax" 等英文术语）。**当下不影响功能**，写进待办给站主决定。
- LaTeX 化建议：③ 维持 PDF 存档即可——单年期中 cheat sheet 不值得重制（与 6-15 抽检的 `cheat-sheet-final-2022.md` 同结论）。

**抽检 4/10 · `note`（科研妙招 · R 教程）· `_notes/research/r-psy-stats-ii.md`**（33 行 / 2.7 KB）
- 已修复：无。
- 一致性：✅ `permalink: "/research/r-tutorials/r-psy-stats-ii"` 与 6 条 sibling R 教程（r-multiple-linear-regression / r-brucer-moderation-mediation / r-pca / r-correlation-distance / r-survival-analysis / r-cluster-analysis）形成完整串读；front-matter 完整（layout/title/main_category=科研妙招/sub_category=R 教程/author=Zircon/permalink/published=true/keywords ×35 厚足覆盖"心理统计 II 完整复习" / "psych stats" / "R 教程" / "MLR" / "ANOVA" / "moderation mediation" / "PCA 主成分分析" / "信度分析" / "聚类分析" / "Logistic 回归" / "bruceR 包" / "tidyverse" 等核心术语）。
- 内容观感 ✅：33 行简短整合公告帖，把"心理统计 II 期末复习 8 章笔记整合版"事件背景写清并 link 到 6 篇姊妹 R 教程；2 张 inline JPG 图（02.jpg 课程内容表 + 03.jpg + 04.jpg 整合笔记封面/目录）alt 文本齐整带页码 + 内容说明（"按周次列出的讲课内容表，第 6 周起含 Logistic 回归红线标注" / "MLR、调节中介、相关距离、PCA、可靠性、生存分析、聚类共 8 章" / "因子分析、信度分析、生存分析、聚类、方法一致性"）。
- 长期建议：无——属"R 教程"专栏典范短公告帖。

**抽检 5/10 · `note`（生活之问）· `_notes/life/handwash-vs-machine.md`**（284 行 / 14.7 KB）
- 已修复：无。
- front-matter ✅：title「手洗 vs 机洗，到底哪个更好？」/ sub_category=生活之问 / permalink `/life/handwash-vs-machine` / keywords ×23 覆盖核心搜索词（"手洗 vs 机洗" / "手洗还是机洗" / "洗衣机洗衣服" / "哪些衣服必须手洗" / "建议手洗" / "羊毛怎么洗" / "羊绒手洗" / "真丝怎么洗" / "丝绸洗涤" / "毡化 felting" / "洗衣袋" / "轻柔程序" / "牛仔裤怎么洗" / "毛衣怎么洗" / "贴身衣物清洗" / "洗衣机干净吗"）。
- 内容观感 ✅：284 行五段式结构齐全（问题 → 结论先行 → 哪些必须手洗 → 哪些机洗反而更好 → 实践建议 → 标签解读），符合「生活之问」专栏调性；表格密集（衣物分类 + 程序对照 + 标签符号速查）信息密度高。
- 长期建议：无——属生活之问专栏典范长文。

**抽检 6/10 · `game` · `toolbox/memory/index.html`**（714 行 / 23.5 KB inline）
- 已修复：无。
- 待办：无新增。
- 长期建议：714 行远低于 >1000 行拆分阈值；inline-only（无独立 .js/.css）；2 处 `:hover` 全部 `@media (hover: hover)` 守卫 ✅（`hover_no_media.py` clean 印证）。维持现状即可——属经典记忆翻牌小游戏，与 6-19 抽检的 `toolbox/2048/index.html`（979 行）同性质，规模 / 风格 / 守卫齐平。

**抽检 7/10 · `lecture_note_pdf_only` · `_notes/study/psy-stat-I/cheat-sheet-final-2022.md`**（17 行 / 1.4 KB，PDF-only 存档 · 与 6-15 抽检 3/10 重复同抽样）
- 已修复：无。
- 一致性：✅ `pdf_url: "/files/psy-stat-I/cheat-sheet-final-2022.pdf"` 路径有效；front-matter 完整（layout/main_category/sub_category=心理统计Ⅰ/course/material_type=Exams/date=2022-09-01/author=Zircon/discipline=心理学/keywords ×30 厚足覆盖中英文术语 + "ANOVA 公式" / "t 检验 公式" / "Cohen's d 公式" / "η² eta squared" / "Type I Type II error" + "心里统计" 错别字兜底）；summary 介绍清晰（"假设检验、t/F/卡方/ANOVA、回归、效应量等核心公式压缩到 A4 双面"）。
- LaTeX 化建议：③ 维持 PDF 存档即可——本科心理统计 Ⅰ 期末 cheat sheet 单年资料无更新需求（与 6-15 抽检结论完全一致）。

**抽检 8/10 · `lecture_note_pdf_only` · `_notes/study/china-hist/china-hist-2024.md`**（与 6-21 抽检 3/10 重复同抽样）
- 已修复：无。
- 一致性：✅（与 6-21 抽检结论完全一致）`pdf_url: "/files/china-hist/china-hist-2024.pdf"` 路径有效（PDF 1.8 MB 实存）；front-matter 完整（layout/main_category=学习资料/sub_category=中国古代文化/course/material_type=Notes/date=2024-09-01/author=Zircon/discipline=通识/keywords ×26 厚足覆盖中英文术语 + 错别字「中国古代文话」+ "PKU"/"北大 通识"/"诸子百家"/"宋明理学"/"科举 制度"等核心搜索词）；summary 介绍清晰。
- LaTeX 化建议：③ 维持 PDF 存档即可——通识课课堂笔记 1.8 MB 量级合理，PDF 形态满足搜索 + PDF 内嵌预览即可。

**抽检 9/10 · `note`（生活之问）· `_notes/life/coaster-drop-tower-braking.md`**（257 行 / 18.4 KB）
- 已修复：无。
- front-matter ✅：title「跳楼机、过山车是怎么稳稳停下来的？没有发动机也没有刹车片」/ sub_category=生活之问 / permalink `/life/coaster-drop-tower-braking` / keywords ×26 覆盖核心搜索词（"跳楼机 怎么减速" / "跳楼机 原理" / "过山车 刹车" / "电涡流制动 eddy current brake" / "永磁制动器 magnetic brake" / "楞次定律 Lenz law" / "感应电流 反向力" / "无接触刹车" / "fail-safe 刹车 失效保险" / "高速列车 涡流制动 ICE TGV" / "迪士尼 飞越地平线" / "Velocity Magnetics" / "Intamin 制动 Bolliger Mabillard 制动" / "线性感应电机 LIM 弹射 过山车" / "液压缓冲 终端"），中英文术语 / 品牌厂商 / 原理学名全覆盖。
- 内容观感 ✅：257 行五段式结构齐全（问题 → 原理 → 各类减速方式对比 → 安全保险 → 题外话），符合「生活之问」专栏调性；电涡流制动 / 永磁制动器 / 液压缓冲三大原理讲解清楚，含具体厂商案例（Velocity Magnetics / Intamin / B&M），属硬核科普文典范。
- 长期建议：无——属生活之问专栏典范长文，与 6-21 抽检的 `lane-change-illusion.md`（变道错觉）同样兼具循证 + 工程实例的高质量。

**抽检 10/10 · `game` · `toolbox/connect4/index.html`**（964 行 / 33.1 KB inline）
- 已修复：无。
- 待办：无新增。
- 长期建议：964 行接近 >1000 行拆分阈值但尚未越线；inline-only（无独立 .js/.css）；2 处 `:hover` 全部 `@media (hover: hover)` 守卫 ✅（`hover_no_media.py` clean 印证）。与 6-20 抽检的 `toolbox/2048/index.html`（979 行）规模相当，维持现状即可——属经典桌游小游戏规模合理。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点本次 `backend_pulse.py` 仍全报 HTTP 403。与 5-27 ~ 6-21 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。**今日 5 个 commit 全部前端**（assets/js/games/guandan.js + toolbox/guandan/index.html），后端无新增依赖。

---

## 2026-06-21

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周日 DOW=7，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=21，未跑 monthly_stats）。**距 6-20 巡检 0 个新 commit**——HEAD 仍是 `6b13484`（6-20 daily-review 自动提交），自昨晚 6-20 00:08 UTC 至今 6-21 00:03 UTC 这 24 小时内站主未推任何手写 commit，工作树纯净（`git status` clean、`git ls-files --others --exclude-standard` 空、无任何 .DS_Store / *.bak / 副本文件 / 凭证泄露痕迹），无新分支、无新远端引用。`bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（13.206 s，cold build）。今日 `scripts/audit/run.sh` 全套审计 **13/13 每日项全 clean**——`keywords_coverage`（散文 121 篇全部充足，与 6-20 完全一致）/ `images`（仅 `files/interm-macro/interm-macro-2022-zh.pdf` 2.13 MB 大文件，承接 6-16 中文版讲义首发，markdown 入口正常，与 6-16 / 6-17 / 6-18 / 6-19 / 6-20 同）/ `material_type_enum`（分布完全无变化：Notes ×44 / Exams ×40 / 课程测评 ×18 / 经验之谈 ×5 / 错题本 ×3 / 写作 ×2 / 口语 ×1 / 词汇 ×1）/ `filename_convention` / `hover_no_media`（0 commit，无 `:hover` 新增）/ `sibling_crosslink`（9 个 ≥3 篇 sub_category 组全互链）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检见下）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-20）。**今日 0 项自动修复**——0 个 commit、所有审计 clean、抽检 10 项无新增问题。**P1 队列**：仅 `study_order` 未列 `interm-econometrics` 一条 P1 仍有效（承接 6-13 至 6-20 共 8 日），今日核对 `ls _notes/study/` 共 24 个目录、`_config.yml` `study_order` 共 23 条，唯一差集仍是 `interm-econometrics`，与 6-19 / 6-20 核对完全一致。**抽检 10 项无新增问题**（4 个 pdf_archive `adv-macro-psu/chapters/ch5.pdf` + `adv-micro-pku/chapters/ch2.pdf` + `adv-micro-psu/chapters/ch8.pdf` 三个章节切片各被英文学术主页 `/index.html` L602 / L623 / L638 唯一引用，与 6-19 抽检的 `adv-micro-psu/2025-final.pdf`、6-20 抽检的 `adv-micro-pku/chapters/ch6.pdf` 同 pattern；`psy-stat-I/anova-R.pdf` 被 `_notes/study/psy-stat-I/anova-R.md` 唯一引用；1 个 lecture_note_pdf_only `china-hist/china-hist-2024` PDF 1.8 MB 有效、front-matter 完整、keywords ×26 厚足；1 个 lecture_note_full `adv-micro-psu/adv-micro-psu-2026` 148 行 / 33 keywords，含 5-part 9-章博弈论结构、章节依赖图、6 套考题完整解答，是站内目前最高质量 lecture_note_full 之一；2 个 life note `lane-change-illusion` 与课程笔记 `tutoring/quadratic-inequality` front-matter 齐整、生活之问 / 数学专栏调性一致；1 个 toefl 老模板分享 `toefl-templates-2023` 34 行 / 9 张 inline 图片，front-matter 简（无 summary / permalink / author 字段）但属 2023-07 老分享格式；1 个 game `toolbox/doudizhu/index.html` 2399 行 / 92.8 KB inline，18 处 `:hover` 全部 `@media (hover: hover)` 守卫，引用 `assets/css/games-shell.css`，符合站内大型游戏 pattern）。

### ✅ 本次已自动修复

无。

0 个 commit、工作树纯净、所有审计项 clean、抽检 10 项无新增可自动处理项，**无需任何修复**。今日唯一动作是更新本 DAILY_REVIEW.md 文档。

### 📋 待你把关

#### P0（紧急）
无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 / 6-14 / 6-15 / 6-16 / 6-17 / 6-18 / 6-19 / 6-20，第 9 日承接）。`/notes/` landing 渲染遍历的就是 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、与同名旧版 `interm-metrics-2023.md` 同名相近但目录不同）这篇在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 共 24 个目录，`study_order` 共 23 条，唯一差集即 `interm-econometrics`。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）属设计判断，仍请你拍板。

#### P2（建议）

1. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接自 6-03。功能正确，纯排版风格小差异，可忽略。
2. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接自 6-03。已有「同课程自动侧栏」覆盖（`sibling_crosslink.py` ✅）但缺手写互链段落引导。属内容写作决策。今日抽检 `psy-stat-I/anova-R` 再次扫到，状态同。
3. **掼蛋 6-18 ~ 6-20 期间联机改造收尾（结算闩 / SSE / 倒计时 / 四视角测试 / 逐家亮牌节奏）大动 10 commit，建议站主在真机 / 微信内置浏览器跑两局完整联机回归** —— 承接 6-20 P2#3。今日无新增 guandan 改动，但 6-19 ~ 6-20 改动尚未真机回归过——若已跑过两局完整联机请告知此项可归档。
4. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 6-17 `008ff4f` 落地 74 首安全改善后剩余的「英文歌 / 翻唱抓错 CD / ASR 漂移」等问题首站主可继续推进。属内容修复决策（承接自 6-18 / 6-19 / 6-20）。
5. **抽检 9/10 `_notes/toefl/toefl-templates-2023.md` 老分享前置 cosmetic** —— 34 行 / 1.8 KB 短笔记，2023-07-11 写的，front-matter 缺 `summary` / `permalink` / `author` 三字段（Jekyll 走默认 permalink 也能渲染、build clean、`frontmatter_yaml.py` 不报错，属早期写作标准）。日后若做老文盘扫可一并补齐；当下不影响任何对外功能，属内容维护决策，无需立刻动。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化。** 工作树干净（`git status` clean、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、无副本文件 / 密钥 / 凭证 / 个人路径痕迹）。0 commit 自然 0 新增目录 / 文件 / 依赖 / 二进制。`_config.yml` 的 `exclude:` 列表已含 `DAILY_REVIEW.md`、`EMAIL_SUMMARY.md`、`SPOTCHECK_100_REPORT.md`、`SPOTCHECK_100_AGENT_REPORTS.md`、`TOOLBOX_AUDIT_REPORT.md`、`docs/`、`scripts/`、`tools/`、`_paid/`、`audio/`、`backends/`、`.claude/`、`.githooks/` 等所有内部目录与产物（grep 已核对）。`.gitignore` 状态未变。**结论**：与 6-15 / 6-16 / 6-17 / 6-18 / 6-19 / 6-20 同——仓库目录基线稳定，无可优化空间，跳过结构调整。

### 🔬 抽检专项

**抽检 1/10 · `game` · `toolbox/doudizhu/index.html`**（2399 行 / 92.8 KB inline，无独立 .js/.css）
- 已修复：无。
- 待办：无新增。
- 长期建议：单文件 2399 行已大幅超过站主自定的 >1000 行考虑拆分阈值（与 6-19 抽检的 `chess` 1986 行同性质，但比 chess 更高），inline-only（无独立 .js/.css）；与 `assets/css/games-shell.css` 主题样式系统协调一致。18 处 `:hover` 全部 `@media (hover: hover)` 守卫 ✅（`hover_no_media.py` clean 印证）。深色模式适配良好（`:root[data-theme="dark"]` overrides 完整）。考虑长期：是否要参考 6-04 `d85c349` pet 拆分（5303 → 32 行 index.html + `_includes/toolbox/pet/{board,modals}.html` + `assets/css/pet.css` + `assets/js/pet.js`）做相同处理？属架构决策，需站主拍板，不擅自动手。

**抽检 2/10 · `pdf_archive` · `files/adv-macro-psu/chapters/ch5.pdf`**（195.4 KB）
- 已修复：无。
- 归属：✅ `/index.html` L638 唯一引用（"Ch 5: The Solow Growth Model"），属英文学术主页 PSU 高宏章节切片系列；与同系列 ch1–ch8 同 pattern（6-19 抽检的 ch6、6-20 抽检的 `adv-micro-pku/ch6` 均同此架构）。
- 体积合理性：195.4 KB 极小，未列入 `EXEMPT_FILES`、`images.py` 未报。
- LaTeX 化潜力：低——PSU 高宏章节切片，目前只有 PDF 没有 .tex 源，教学场景已固定为研究生录入资料，建议维持 PDF 存档。

**抽检 3/10 · `lecture_note_pdf_only` · `_notes/study/china-hist/china-hist-2024.md`**
- 已修复：无。
- 一致性：✅ `pdf_url: "/files/china-hist/china-hist-2024.pdf"` 路径有效（PDF 1.8 MB 实存）；front-matter 完整（layout/main_category=学习资料/sub_category=中国古代文化/course/material_type=Notes/date=2024-09-01/author=Zircon/discipline=通识/keywords ×26 厚足覆盖中英文术语 + 错别字「中国古代文话」+ "PKU"/"北大 通识"/"诸子百家"/"宋明理学"/"科举 制度"等核心搜索词）；summary 介绍清晰（"按朝代和文化主题（思想、制度、文学、礼乐）梳理脉络"）。
- LaTeX 化建议：③ 维持 PDF 存档即可——通识课课堂笔记 1.8 MB 量级合理，定位明确无更新需求，PDF 形态满足搜索 + PDF 内嵌预览即可。

**抽检 4/10 · `pdf_archive` · `files/adv-micro-pku/chapters/ch2.pdf`**（249.7 KB）
- 已修复：无。
- 归属：✅ `/index.html` L602 唯一引用（"Ch 2: Consumer Theory"），属英文学术主页 PKU 高微章节切片 ch1–ch6 系列之一；与 6-06 抽检 `ch2.pdf`（同文件抽到了第二次）+ 6-20 抽检的 `ch6.pdf` 同 pattern。
- 体积合理性：249.7 KB 极小，未列入 `EXEMPT_FILES`、`images.py` 未报。
- LaTeX 化潜力：低——PKU 高微章节切片，目前只有 PDF 没有 .tex 源，教学场景已固定为研究生录入资料，建议维持 PDF 存档。

**抽检 5/10 · `lecture_note_full` · `_notes/study/adv-micro-psu/adv-micro-psu-2026.md`**（148 行 / 11.8 KB）
- 已修复：无。
- 一致性：✅ `pdf_url: "/files/adv-micro-psu/adv-micro-psu-lecture-notes.pdf"` 路径有效（PDF 1.29 MB 实存）；front-matter 完整（layout/main_category/sub_category=高级微观经济学（PSU）/course/material_type=Notes/date=2026-05-04/author=Zircon/discipline=经济学/keywords ×33 厚足覆盖 ECON 521 / Krishna / Penn State / Nash bargaining / Rubinstein / Gale-Shapley / Myerson / VCG / PBE / repeated games / micro prelim 等 PhD 微观核心术语）；summary 介绍清晰（"跟着 Krishna 教授 ECON 521 一整学期写出来的高微讲义，299 页 PDF，覆盖 9 章 + 13 套 PS + 6 套考试完整解答"）。
- 内容观感 ✅：148 行散文式发表帖，含「起因 / 这本讲义是什么 / 适合谁 / 怎么用（章节依赖图 + 颜色 boxed envs 速查 + 直觉先于形式 + PS/往年题完整收录）/ 几个做对的事 / 局限与免责 / 怎么获取 / 写在最后」整套结构；章节依赖图用 ASCII 框图绘制清晰；信息租 `$\frac{1-F(x)}{f(x)}` 直觉讲解贴切；先讲直觉再上数学的写作哲学贯穿；写作过程中 Claude Code 辅助 LaTeX 排版的免责声明合理透明。
- LaTeX 化状态：✅ **已 LaTeX 化**——本身就是 .tex 编译产物（299 页讲义 PDF）；本帖是 .md 发表帖配对 .pdf 下载。该 PDF 1.29 MB 体积合理。
- 长期建议：无——这是站内目前最高质量 lecture_note_full 之一（仅次于本人其他长讲义），结构与文笔均堪典范。

**抽检 6/10 · `note`（生活之问）· `_notes/life/lane-change-illusion.md`**（331 行 / 23.6 KB）
- 已修复：无。
- front-matter ✅：title「塞车时隔壁车道总比你快，一变过去它就停——这到底是错觉还是玄学？」/ sub_category=生活之问 / permalink `/life/lane-change-illusion` / keywords ×25 覆盖核心搜索词（"变道错觉"、"隔壁车道总比我快"、"一变道就更慢"、"塞车变道"、"车道手风琴"、"交通流守恒"、"Redelmeier Tibshirani"、"next lane seems faster"、"幽灵堵车"、"走停波"、"拉链式并线 / zipper merge"、"晚并线"，含错别字兜底 "变到错觉" / "为什么换道不快"）。
- 内容观感 ✅：331 行五段式结构齐全（问题 → 结论先行 → 科学原理 → 实践建议 → 参考来源），与「[幽灵堵车](/life/phantom-traffic-jam)」姊妹篇对照清晰；科学原理三层递进（认知错觉 Redelmeier 1999 → 手风琴相位 → 守恒论证）；含 inline SVG「同样的平均速度，被超时段又长又显眼」+ inline JS canvas 车流模拟（M=车数、200 行 IDM 跟车 + MOBIL 变道决策算法实现，可视化「守 vs 变」对照）；参考来源 5 条含 Nature 1999 原文、LWR 1955–1956 守恒理论、Treiber-Kesting 教科书、明尼苏达州交通局 zipper merge 官方说明，循证规范。
- 长期建议：无——这是「生活之问」专栏典范长文。

**抽检 7/10 · `pdf_archive` · `files/adv-micro-psu/chapters/ch8.pdf`**（305.3 KB）
- 已修复：无。
- 归属：✅ `/index.html` L623 唯一引用（"Ch 8: Repeated Games"），属英文学术主页 PSU 高微章节切片系列；与抽检 5 的 `adv-micro-psu-lecture-notes.pdf` 同源，但 ch8.pdf 是章节切片独立链接（教学便利）。
- 体积合理性：305.3 KB 极小，未列入 `EXEMPT_FILES`、`images.py` 未报。
- LaTeX 化潜力：✅ **已 LaTeX 化**——整本 PSU 高微讲义 `adv-micro-psu-lecture-notes.pdf` 已是 .tex 编译产物（见抽检 5），ch8 是其中第 8 章的切片；维持现状即可。

**抽检 8/10 · `pdf_archive` · `files/psy-stat-I/anova-R.pdf`**（314.3 KB）
- 已修复：无。
- 归属：✅ `_notes/study/psy-stat-I/anova-R.md` 唯一引用 `pdf_url: "/files/psy-stat-I/anova-R.pdf"`，路径一致；同目录 `final-2022.md` 也间接相关。
- 体积合理性：314.3 KB 极小，未列入 `EXEMPT_FILES`、`images.py` 未报。
- LaTeX 化潜力：③ 维持 PDF 存档——本科心理统计 R 代码模板综合表，定位为「写实验报告时对着抄」的查表用文档，已稳定使用，迁移成本与收益不匹配；keywords ×29 厚足（含 bruceR / ezANOVA / afex / Tukey HSD / Bonferroni / Mauchly 等）。承接 6-03 P2#2 互链建议：可加同课程手写互链段落引导（自动侧栏已覆盖）。

**抽检 9/10 · `note`（TOEFL 模板分享）· `_notes/toefl/toefl-templates-2023.md`**（34 行 / 1.8 KB）
- 已修复：无。
- front-matter ⚠️：title「托福写作与口语模板」/ sub_category=TOEFL / discipline=语言考试 / material_type=写作 / keywords ×13 覆盖核心搜索词（"托福写作 模板"、"TOEFL writing template"、"toeflresources"、"老托福 模板"、"独立写作 模板"、"综合写作 模板"等）；**缺 `summary` / `permalink` / `author` 三字段**——属 2023-07 早期写作标准，Jekyll 走默认 permalink 也能渲染、build clean、`frontmatter_yaml.py` 不报错，但与新写作约定有差距。
- 内容观感：34 行短分享，9 张 inline JPG 图片（托福模板 LaTeX 文档逐页扫图，含封面 + 综合写作 + 独立写作 + 口语四类题型），alt 文本齐整带页码 + 内容说明；正文文字简（仅介绍 toeflresources.com 资源 + 「文末阅读原文是蓝色的~」公众号迁移残留语）。
- 待办：见 P2 #5，老分享缺 summary / permalink / author 属内容维护决策，建议日后做老文盘扫一并补齐；当下不影响功能、不需立即动手。
- 长期建议：无紧迫项。

**抽检 10/10 · `note`（初升高数学）· `_notes/tutoring/quadratic-inequality.md`**（46 行 / 1.2 KB）
- 已修复：无。
- front-matter ✅：title「一元二次不等式」/ sub_category=数学 / course=数学 / discipline=初升高 / material_type=Notes / date=2026-01-21 / permalink `/notes/tutoring/quadratic-inequality` / `redirect_from: /notes/pre-high-school/quadratic-inequality`（保留旧路径兼容）/ pdf_url `/files/tutoring/quadratic-inequality/Main.pdf` / `published: true` / keywords ×28 厚足（覆盖中英文术语「数轴标根法」「穿根法」「韦达定理」「判别式」「区间表示法」「quadratic inequality」+ 错别字兜底「一元二次不等试」「一元二次不等士」+ 口诀类「大于取两边 小于取中间」）。
- 一致性：✅ PDF 文件实存（`files/tutoring/quadratic-inequality/Main.pdf` 143.7 KB），同目录有 .tex 源（`Main.tex` + `chapters/` + `commands.tex` + `theorems.tex` + `Makefile`），**已 LaTeX 化**。
- 长期建议：无——初升高数学辅导讲义，LaTeX 源已签入，体积合理。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点本次 `backend_pulse.py` 仍全报 HTTP 403。与 5-27 ~ 6-20 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。**今日 0 commit 全部纯巡检**，后端无新增依赖。

---

## 2026-06-20

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周六 DOW=6，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=20，未跑 monthly_stats）。距 6-19 巡检共 **3 个 commit**（`ef6885a` 之后 → `3f56f7b` 为止），仍是**昨日掼蛋（guandan）联机改造的小幅收尾**：① `4bcfae4` 修联机「undefined 张炸弹」横幅 + 局终摊牌停留漏判座 0——`playBombFx` 张数改从 `cards.length` 数（联机服务端下发的 `lastPlay` 只有 `{type,cards}` 无 `.len`，别家/AI 普通 4 张炸弹的中央横幅曾显示「undefined 张炸弹」），6+ 张炸的震屏判定同步改用数出来的张数；`endRound` 摊牌停留扫描补上本地座 0，自己是唯一末游、独自留牌时结算面板不再无 1.5 s 停留秒弹（mp11）。② `ec8bd7a` 联机出牌「逐家亮牌」节奏 + 收圈赢牌停留——服务端 `advanceAi` 把我这手之后的多家(AI/真人)一次算完同帧下发；客户端不再一次铺好，而是保留上帧桌面、按座次一家家亮出本帧新出牌（每家间隔 ~480ms，含「不出」、含张数同步减少、炸弹随亮牌放特效），仿单机 `scheduleAI` 的思考停顿；亮牌期间挡操作，最后收尾到权威态并挂出牌闹钟；收圈那帧让赢这圈的一手在桌上多停留 ~700ms 再清桌，对齐单机 `afterMove` 的 800ms 缓冲；任何更新的服务端帧都作废在途定时器、以最新权威态收尾（`_tableGen` 代际 + `isNetworked` 守卫，离线/换局自愈）；`round_end/match_end/tribute/测试模式` 一律即时铺好，不影响结算摊牌与四视角切座；仅联机路径生效（`applyServerGameState` 顶部 `isNetworked` 守卫），单机零改动（mp12）。③ `3f56f7b` 逐家亮牌间隔 480ms → 100ms（更跟手）+ mp13——上一版 480ms 间隔在 4 家轮一圈时累计偏慢、影响节奏感，回收到 100ms 仍保留「一家家亮」的视觉信息但不再拖累手感。共改 2 个文件：`assets/js/games/guandan.js` 3 次（+123 / -29）、`toolbox/guandan/index.html` 3 次（缓存版本号 mp11/mp12/mp13）。**0 文章内容改动 / 0 站点 IA 改动**——3 个 commit 全部锁在 `assets/js/games/guandan.js` + `toolbox/guandan/index.html` 两个文件。`bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（11.941 s，cold build）。今日 `scripts/audit/run.sh` 全套审计 **13/13 每日项全 clean**——`keywords_coverage`（散文 121 篇全部充足）/ `images`（仅 `files/interm-macro/interm-macro-2022-zh.pdf` 2.13 MB 大文件，承接 6-16 中文版讲义首发，markdown 入口正常，与昨日一致）/ `material_type_enum`（分布完全无变化：Notes ×44 / Exams ×40 / 课程测评 ×18 / 经验之谈 ×5 / 错题本 ×3 / 写作 ×2 / 口语 ×1 / 词汇 ×1）/ `filename_convention` / `hover_no_media`（3 次掼蛋改动后无裸 `:hover` 引入）/ `sibling_crosslink`（9 个 ≥3 篇 sub_category 组全互链）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检见下）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-19）。**今日 0 项自动修复**——3 个 commit 全部合规。**P1 队列**：仅 `study_order` 未列 `interm-econometrics` 一条 P1 仍有效（承接 6-13 至 6-19 共 7 日）；今日另核对：`ls _notes/study/` 共 24 个目录，`_config.yml` `study_order` 共 23 条，唯一差集即 `interm-econometrics`，与昨日核对完全一致。**抽检 10 项无新增问题**（3 个 pdf_archive `corp-fin/cheat-sheet-mid-2022.pdf` + `monetary-econ/monetary-econ-2023.pdf` + `gre/GRE-Quant.pdf` 各被对应 markdown `pdf_url` 唯一引用，`adv-micro-pku/chapters/ch6.pdf` 被英文学术主页 `/index.html` L606 引用；2 个 lecture_note_pdf_only `corp-fin/final-2020` + `interm-macro/interm-macro-2022` PDF 路径有效、front-matter 完整、keywords 厚足；3 个 life note `clothes-damage-physics` `wifi-through-walls` 与课程测评 `ted-speaking-review-2022` front-matter 齐整、生活之问 / 课程测评两个专栏调性一致；1 个 game `toolbox/2048/index.html` 979 行 / 33.8 KB inline，2 处 `:hover` 全部 `@media (hover: hover)` 守卫）。

### ✅ 本次已自动修复

无。

3 个 commit 全部锁在 `assets/js/games/guandan.js` + `toolbox/guandan/index.html` 两个文件内，无文章内容 / 信息架构 / 搜索 / 样式 / 配置 / front-matter 改动。所有审计项 clean，未发现任何无争议低风险问题可自动处理。

### 📋 待你把关

#### P0（紧急）
无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 / 6-14 / 6-15 / 6-16 / 6-17 / 6-18 / 6-19，第 8 日承接）。`/notes/` landing 渲染遍历的就是 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、与同名旧版 `interm-metrics-2023.md` 同名相近但目录不同）这篇在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 共 24 个目录，`study_order` 共 23 条，唯一差集即 `interm-econometrics`。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）属设计判断，仍请你拍板。

#### P2（建议）

1. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接自 6-03。功能正确，纯排版风格小差异，可忽略。
2. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接自 6-03。已有「同课程自动侧栏」覆盖（`sibling_crosslink.py` ✅）但缺手写互链段落引导。属内容写作决策。
3. **掼蛋 6-18 ~ 6-20 期间联机改造收尾（结算闩 / SSE / 倒计时 / 四视角测试 / 逐家亮牌节奏）大动 10 commit，建议站主在真机 / 微信内置浏览器跑两局完整联机回归** —— 承接 6-19 P2#3，今日新增「逐家亮牌 100ms 间隔」节奏需重点观察：① 联机别家 / AI 出牌时是否一家家亮出而非一帧全弹（修了体感不一致），且 100ms 间隔是否过快（站主可能想再回 200–300ms 区间）；② 收圈那帧赢这圈的一手是否在桌上多停留 ~700ms 再清桌；③ 「undefined 张炸弹」横幅是否已修；④ 局终摊牌停留扫描是否补上本地座 0；以及承接 6-19 的 SSE / 倒计时 / 四视角验证。沙箱无浏览器无法替代真机回归。
4. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 6-17 `008ff4f` 落地 74 首安全改善后剩余的「英文歌 / 翻唱抓错 CD / ASR 漂移」等问题首站主可继续推进。属内容修复决策（承接自 6-18 / 6-19）。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化。** 工作树干净（`git status` clean、`git ls-files --others --exclude-standard` 空、无 `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / 副本文件 / 密钥 / 凭证 / 个人路径痕迹）。3 个 commit 全部锁在 `assets/js/games/guandan.js` + `toolbox/guandan/index.html` 两个文件；未引入新目录 / 新顶级文件 / 新依赖 / 新二进制。`_config.yml` 的 `exclude:` 列表已含 `DAILY_REVIEW.md`、`EMAIL_SUMMARY.md`、`SPOTCHECK_100_REPORT.md`、`SPOTCHECK_100_AGENT_REPORTS.md`、`TOOLBOX_AUDIT_REPORT.md`、`docs/`、`scripts/`、`tools/`、`_paid/`、`audio/`、`backends/`、`.claude/`、`.githooks/` 等所有内部目录与产物。`.gitignore` 状态未变。**结论**：与 6-15 / 6-16 / 6-17 / 6-18 / 6-19 同——仓库目录基线稳定，无可优化空间，跳过结构调整。

### 🔬 抽检专项

**抽检 1/10 · `game` · `toolbox/2048/index.html`**（979 行 / 33.8 KB inline）
- 已修复：无。
- 待办：无新增。
- 长期建议：单文件 979 行接近站主自定的 >1000 行考虑拆分阈值但尚未越线；inline-only（无独立 .js/.css）与其他小游戏一致。2 处 `:hover` 全部 `@media (hover: hover)` 守卫 ✅（`hover_no_media.py` clean 印证）。维持现状即可。

**抽检 2/10 · `pdf_archive` · `files/corp-fin/cheat-sheet-mid-2022.pdf`**（1.3 MB）
- 已修复：无。
- 归属：✅ `_notes/study/corp-fin/cheat-sheet-mid-2022.md` 唯一引用 `pdf_url: "/files/corp-fin/cheat-sheet-mid-2022.pdf"`，路径一致。
- 体积合理性：1.3 MB（cheat sheet 含密集公式 / 表格，1.3 MB 合理），未列入 `EXEMPT_FILES`、`images.py` 未报。
- LaTeX 化潜力：低——PKU 光华公司财务管理期中考前速查表，一次性资料无更新需求；建议维持 PDF 存档。

**抽检 3/10 · `lecture_note_pdf_only` · `_notes/study/corp-fin/final-2020.md`**
- 已修复：无。
- 一致性：✅ `pdf_url: "/files/corp-fin/final-2020.pdf"` 路径有效；front-matter 完整（layout/main_category/sub_category=公司财务管理/course/material_type=Exams/date=2020-09-01/author=Zircon/discipline=管理学/keywords ×27 含错别字「公司材务 / 公司财物」+ 中英文术语 WACC/NPV/IRR/MM 定理 + 北大 / 光华课程别名）；summary 引导先合上答案做。
- LaTeX 化建议：③ 维持 PDF 存档即可——2020 年期末真题题面，定位明确无更新需求。

**抽检 4/10 · `pdf_archive` · `files/monetary-econ/monetary-econ-2023.pdf`**（464.5 KB）
- 已修复：无。
- 归属：✅ `_notes/study/monetary-econ/monetary-econ-2023.md` 唯一引用 `pdf_url: "/files/monetary-econ/monetary-econ-2023.pdf"`，路径一致。
- 体积合理性：464.5 KB（教科书彩色盒子排版 57 页 + 7 张 TikZ 图），已列入 `images.py` 的 `EXEMPT_FILES`（损坏不能压缩）。
- LaTeX 化潜力：高——光华金融经济方向《货币经济学》整学期英文教科书式讲义、教科书彩色盒子排版（含 OLG / 货币即记忆 / 通胀税 / 央行制度等），若有 .tex 源可纳入 LaTeX 化队列。属设计判断。

**抽检 5/10 · `lecture_note_pdf_only` · `_notes/study/interm-macro/interm-macro-2022.md`**
- 已修复：无。
- 一致性：✅ `pdf_url: "/files/interm-macro/interm-macro-2022.pdf"` 路径有效；front-matter 完整（layout/main_category/sub_category=中级宏观经济学/course/material_type=Notes/date=2022-09-01/author=Rui Zhou/discipline=经济学/keywords ×48 厚足覆盖中英文术语 + 教材名 Mankiw / Williamson + PKU / 光华 / 颜色 Se Yan 等）；summary 介绍清晰，149 页教科书彩色盒子排版，并提示「另有内容对应的中文版讲义」。
- LaTeX 化建议：高——149 页整学期英文讲义、教科书彩色盒子排版，若有 .tex 源属高优 LaTeX 化候选。属设计判断。

**抽检 6/10 · `note`（课程测评）· `_notes/course-reviews/ted-speaking-review-2022.md`**（117 行 / 12.4 KB）
- 已修复：无。
- front-matter ✅：title 含「（个人向）」标记 / main_category=学习资料 / sub_category=英语创意表达-TED 演讲视听说 / course / material_type=课程测评 / review_category=英语 / semester=2022 秋 / keywords ×18 覆盖中英文（"英语创意表达课程测评" / "TED Talks 课" / "B 级英语课" / "TED speaking" / "吴芊老师"）。
- 内容观感 ✅：117 行个人向课程测评，按 sub_category / review_category 双归类合理；属课程测评专栏调性一致。
- 长期建议：无。

**抽检 7/10 · `pdf_archive` · `files/adv-micro-pku/chapters/ch6.pdf`**（134.8 KB）
- 已修复：无。
- 归属：✅ `/index.html` L606 唯一引用（"Ch 6: General Equilibrium"），属英文学术主页章节切片 ch1–ch6 系列之一；与 6-06 抽检 `ch2.pdf` 同 pattern。
- 体积合理性：134.8 KB 极小，未列入 `EXEMPT_FILES`、`images.py` 未报。
- LaTeX 化潜力：低——PKU 高微章节切片，目前只有 PDF 没有 .tex 源（与 ch2 同），教学场景已固定为研究生录入资料，建议维持 PDF 存档。

**抽检 8/10 · `note`（生活之问）· `_notes/life/clothes-damage-physics.md`**（296 行 / 11.7 KB）
- 已修复：无。
- front-matter ✅：title 「衣服为什么会缩水、变形、起球、变黄、起静电？」/ sub_category=生活之问 / permalink `/life/clothes-damage-physics` / keywords ×20 覆盖核心搜索词（"衣服为什么会缩水"、"衣服缩水变形起球变黄"、"白衣服变黄"、"起球 pilling"、"预缩水 pre-shrunk"、"氨纶老化 spandex lycra 莱卡"、"皮脂氧化发黄"、"衣物保养误区"等中英文术语）。
- 内容观感 ✅：296 行五题合一的生活之问长文，符合专栏调性。
- 长期建议：无。

**抽检 9/10 · `pdf_archive` · `files/gre/GRE-Quant.pdf`**（131.5 KB）
- 已修复：无。
- 归属：✅ 被 `_notes/gre/gre-exam-ui-notebook.md` L320 + `_notes/gre/gre-quant-errors.md` L22 两处引用（属 GRE 错题本「题面版」），与「带答案版」`GRE-Quant-Ans.pdf` + `.tex` 源 + `.sty` 模板四件套配套，绝非孤儿。
- 体积合理性：131.5 KB 极小，未列入 `EXEMPT_FILES`、`images.py` 未报。
- LaTeX 化潜力：✅ **已 LaTeX 化**——`.tex` 源（`files/gre/source/quant/GRE-Quant.tex`）与 `.sty` 模板（`GEEexam_Quant.sty`）已签入，PDF 是 .tex 编译产物，符合站主 GRE 错题本「题面 / 答案双版本切换」原理。维持现状。

**抽检 10/10 · `note`（生活之问）· `_notes/life/wifi-through-walls.md`**（313 行 / 19.3 KB）
- 已修复：无。
- front-matter ✅：title 「WiFi 为什么隔一面墙就掉？2.4G 和 5G 该怎么选？」/ sub_category=生活之问 / permalink `/life/wifi-through-walls` / keywords ×19 覆盖核心搜索词（"WiFi 穿墙"、"WiFi 隔墙信号弱"、"2.4G 还是 5G"、"双频段怎么选"、"WiFi 信道选择"、"Mesh 中继器 电力猫"、"WiFi 6E WiFi 7"、"6GHz 频段"、"dBm 信号强度"、"WiFi 频率波长"，含错别字兜底 "Wifi 穿墙"）。
- 内容观感 ✅：313 行五段式结构齐全，符合生活之问专栏调性。
- 长期建议：无。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点本次 `backend_pulse.py` 仍全报 HTTP 403。与 5-27 ~ 6-19 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。**今日 3 个 commit 全部前端**（assets/js/games/guandan.js + toolbox/guandan/index.html），后端无新增依赖。

---

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
