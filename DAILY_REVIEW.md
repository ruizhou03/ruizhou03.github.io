## 2026-07-12

> 例行无人值守巡检：build 健康度 + 仓库卫生。距 7-11 巡检共 **0 个新 commit**（`git log 554d5ba..HEAD` 空、`git log --oneline -1` 头仍是 `554d5ba chore(daily-review): 2026-07-11 自动巡检`）。工作区自 7-11 上一次 routine 落地后**完全静止**——0 文章 / 0 IA / 0 `_data/` / 0 `_config.yml` / 0 `_notes/` / 0 `files/` / 0 前端 / 0 二进制变动。这是 7-11 那场 27-commit 高强度冲刺日之后的**回落一天**，也是本 routine 自 5-27 常态化以来遇到「距上一次巡检 0 commit」的第五日（前四日分别是 6-28 / 7-01 / 7-09 / 7-10）。
>
> **build 健康度**：`bundle install` ✅（`Bundle complete! 7 Gemfile dependencies, 39 gems now installed.`）+ `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（**15.24 s cold build**，与 7-11 的 12.561 s cold build 同量级）。`_site/` 顶层 **27 项**与 7-11 完全一致（`404.html` `CNAME` `account` `admin` `admin-manifest.json` `assets` `assistant-fulltext.json` `assistant-index.json` `en` `essays` `feed.xml` `files` `flight` `google5306…` `index.html` `life` `manifest.json` `notes` `pdfjs` `redirects.json` `research` `robots.txt` `search.json` `sitemap.xml` `sw.js` `toolbox` `zh`）。`_site/toolbox/forest/index.html` **438533 B（438 KB）**与 7-11 一字不差；`_site/404.html` 87456 B、`_site/zh/about/index.html` 93293 B，也都稳定。`_notes/` 全 **270 篇 md** 仍 100% 覆盖 `keywords:`（`grep -rL '^keywords:' _notes/` 空），搜索体系闭环。`toolbox/forest/index.html` 的 `console.log|debugger|TODO|FIXME|XXX` 仍全 0 命中（净化住）。`_paid/` + `_flight-staging/` 在 `_config.yml` L50/L52 exclude 稳固、`find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）。
>
> **今日 0 项自动修复**——本仓库距上次巡检未发生任何改动，工作树 clean，所有健康度指标与 7-11 一字不差，一切承接项按原优先级持续挂在待办栏。
>
> **P0 承接**：⚠ 承接 7-07 ~ 7-11 的 **forest / ledger / pindou 三个工具的 maskable PWA 图标与主 icon 仍 `byte-identical`**（今日**第 6 日承接**）。今日再次 `md5sum` 核验三对文件 md5 与前五日一字不差：`assets/icons/forest-icon-{512,maskable-512}.png` 都是 `63df7becb4ddc57e2b95e88305a33a18`、`assets/icons/ledger-icon-{512,maskable-512}.png` 都是 `fad6da15326e5fbf54adb03663f78be2`、`assets/icons/pindou-icon-{512,maskable-512}.png` 都是 `fed25167c04f65fc5ce80f28bd12ddf6`。`5c58756` commit body 承诺的 v2「maskable 主体收进 80% 安全圆」实际未落地——Android launcher 圆形遮罩仍会裁掉外圈金环。本 agent 不擅动（需图形工具重画、涉及美术判断）。
>
> **P1 承接**：唯一 P1 仍是承接 6-13 的 `_config.yml`.`study_order` 未列 `interm-econometrics`（今日**第 30 日承接**，达 30 天节点）。核对：`ls _notes/study/` 仍 26 个目录 vs `study_order` 25 条、`comm -23` 差集仍只 `interm-econometrics` 一条。**且**：7-11 自写教材书架上线后，`interm-econometrics-2023.md` 现在在 `/notes/` 顶部书架里已作为 6 卡之一可见（作者 Rui Zhou 命中书架筛选）；下方按 `discipline` 分组渲染的传统树里仍因 `study_order` 缺该 slug 而无课程块。是否仍算 P1、还是已被自写教材书架的引入部分解决 —— 请你拍板：保留现状 / 加进 `study_order` 让下方树里也出现 / 改与 `interm-metrics/` 合并。仓库里最久的 P1，30 天挂账、纯 IA 设计判断、不擅改。
>
> **P2 承接**：承接 7-11 全部 P2（7-11 冲刺日新增 `/zh/about/` + `404.html` + 首页照片堆叠 3 张预渲染 + reduce-motion 翻页 + forest 「grow」暗号 + forest ∞ 灵活模式的六组合真机验收 6 项 / `docs/workflows/*.workflow.js` + `docs/ARCHITECTURE_REVIEW.md` 里含 4+1 处 `/Users/zhourui/…` 本机绝对路径的清理 / `452797e` 书架 commit 声明「现 7 本」实际 6 本的意图确认；以及从 7-10 承接的 forest 两轮对抗式审查修复 6 处的六组合真机验收 6 项 / 建议把「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` 或新建 `docs/adversarial-review.md`、从 7-07 承接的 forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收 + `scripts/audit/maskable_icon_consistency.py`、7-06 承接的 forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名共 30 条）——今日无新观察消除、无新观察加入，承接不变。
>
> **仓库卫生**：目录结构与文件架构**较昨日无变化**——0 commit、0 文件动；`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空、无 5 MB+ 新二进制。大文件核对与 7-11 完全一致：`files/or/or-2023.pdf` 5.3 MB 唯一 5 MB+、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB + `files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB + `pdfjs/build/pdf.worker.mjs` 仍 2 MB+ 群。**结论**：仓库结构较昨日无变化，无需再优化。

### ✅ 本次已自动修复

无。

距上次 review 0 个新 commit、工作区完全静止；build ✅ / `_site/` 27 项结构与 7-11 一字不差 / 关键 assets 尺寸（forest 438 KB / 404.html 87 KB / zh/about 93 KB）稳定 / workspace 干净——无任何低风险小修可做。

### 📋 待你把关

#### P0（紧急）

1. **forest / ledger / pindou 三个工具的 maskable PWA 图标与主 icon 仍 `byte-identical`**（承接 7-07 / 7-08 / 7-09 / 7-10 / 7-11，**第 6 日承接**）。今日再次 `md5sum` 核验三对文件 md5 一字不差与前五日相同：`assets/icons/forest-icon-512.png` 与 `assets/icons/forest-icon-maskable-512.png` 都是 `63df7becb4ddc57e2b95e88305a33a18`、`assets/icons/ledger-icon-512.png` 与 `assets/icons/ledger-icon-maskable-512.png` 都是 `fad6da15326e5fbf54adb03663f78be2`、`assets/icons/pindou-icon-512.png` 与 `assets/icons/pindou-icon-maskable-512.png` 都是 `fed25167c04f65fc5ce80f28bd12ddf6`。`5c58756` commit body 承诺的 v2「maskable 主体收进 80% 安全圆」实际未落地——Android launcher 圆形遮罩仍会裁掉外圈金环 / 装饰。请重新生成三张真正带 80% 安全圆的 maskable-512.png 覆盖。**本 agent 不擅动**：需要图形工具重画、涉及美术判断。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 ~ 7-11，**第 30 日承接**——达 30 天挂账节点）。今日核对：`ls _notes/study/` 仍 26 个目录、`study_order` 仍 25 条，`comm -23` 差集仍只 `interm-econometrics` 一条。**7-11 自写教材书架上线后**，`interm-econometrics-2023.md` 已在 `/notes/` 顶部书架里作为 6 卡之一可见（作者 Rui Zhou 命中书架筛选）；下方按 `discipline` 分组渲染的传统树里仍因 `study_order` 缺该 slug 而无课程块。是否仍算 P1、还是已被自写教材书架的引入部分解决 —— 请你拍板：保留现状 / 加进 `study_order` 让下方树里也出现 / 改与 `interm-metrics/` 合并。仓库里最久的 P1，30 天挂账、纯 IA 设计判断、不擅改。

#### P2（建议）

1. **承接 7-11 全部 P2**——(a) 7-11 冲刺日新增 `/zh/about/` + `404.html` + 首页照片堆叠 3 张预渲染 + reduce-motion 翻页 + forest「grow」暗号 + forest ∞ 灵活模式的六组合真机验收 6 项（iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + PWA standalone；沙箱无 GUI / 无触屏跑不了）；(b) `docs/workflows/*.workflow.js`（4 处）与 `docs/ARCHITECTURE_REVIEW.md`（1 处）里含 `/Users/zhourui/…` 本机绝对路径、暴露 macOS 用户名与桌面路径习惯，`docs/` 虽在 `_config.yml` L34 exclude 内不外泄到 `_site/`、但仓库层面可 git clone 后 grep 到，改成 `path.resolve(__dirname, …)` 或 `${HOME}/…` 更干净——涉及脚本可运行性判断、非「小而无争议」范畴、本 agent 不擅动；(c) `452797e` 书架 commit 声明「现 7 本」但今日仍是 6 本（差「线代」不含 Strang 那本 + 「策略与博弈」两本）——commit body 与实际数据不符的意图确认。

2. **承接 7-10 / 7-07 / 7-06 全部老 P2**（forest 两轮对抗式审查修复 6 处的六组合真机验收 6 项 / 建议把「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` 或新建 `docs/adversarial-review.md`、以及从 7-07 承接的 forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收 + `scripts/audit/maskable_icon_consistency.py`、7-06 承接的 forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名共 27 条）——今日无新观察消除、承接不变。

### 🗂 仓库卫生

**目录结构与文件架构较昨日无变化**——0 commit、0 文件动，`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空、无 5 MB+ 新二进制、无 `.env` / 密钥类文件。大文件核对与 7-11 一字不差：`files/or/or-2023.pdf` 5.3 MB 唯一 5 MB+、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB + `files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB + `pdfjs/build/pdf.worker.mjs` 仍是 2 MB+ 群。`_paid/` + `_flight-staging/` 在 `_config.yml` L50/L52 exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）等所有内部产物。**结论**：仓库结构较昨日无变化，无需再优化。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点承接沙箱无 fly.io 出口现象、不阻塞巡检、未主动重启 fly app。**今日 0 个新 commit**，无后端 / 前端 / 依赖 / 内容变化。

---

## 2026-07-11

> 例行无人值守巡检：build 健康度 + 仓库卫生。距 7-10 巡检共 **27 个新 commit**（`ed0b7e8..954df00`）—— 连续两日「0 commit 整休」之后突然爆发的高强度冲刺日，改动集中在四条主线：**forest 上线前审查 + 灵活模式 + 开发者暗号**（`a88e180 cd50f4c ea017f9 3d46d72 f370c72 bc57c34` 6 个 commit）、**中文站门面升级两波与首页照片翻页 8 连迭代**（`77efa5b 60aa7f4 6e12023 9d50cfd 90edf90 0cb1a8b 46a3f2b 8106c98 5055f9c 62f23b8 61c237a 6ae758e 954df00` 13 个 commit，含新建 `zh/about.html` + 5 张真人照 portrait-boya/guanghua/huabiao/stair/window.jpg）、**品牌统一「锆铌 Zr」金字标 + 文章编辑式排版**（`8ab30ee 7d68d3b 05c76f9 840c5a9` 4 个 commit）、**/notes/ 顶部"自写教材书架"皮面封面 + 树里去重**（`452797e 618d4c0` 2 个 commit）、**成熟度后台点选 + 百宝箱普通卡质感 + 首页 404 页**（`72d5720 588308d` + 新建 `404.html`）。net +1268 / -137 行、20 个文件动、7 个新增文件（`404.html` `zh/about.html` 5 张 portrait JPG）。
>
> **build 健康度**：`bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（12.561 s cold build → 修复后重构 4.975 s incremental）。`_site/` 顶层**由 26 项升到 27 项**——新增 `404.html`（`_site/404.html` 87 KB，layout=default、`permalink: /404.html`、`noindex: true`，写着「这一页走丢了」+ 回首页 / 逛百宝箱 双门；比 Jekyll 默认 404 优雅得多）；其余 26 项与 7-10 一致，且新增 `_site/zh/about/index.html`（源 `zh/about.html` 152 行，`permalink: /zh/about/`，站主人格主场页——含北大光华 portrait + 一段自我介绍 + 学术履历 + 「随笔 / 学习资料 / 生活攻略 / 科研妙招」四扇门 + 关闭语；`zh/index.html:77` 已挂「关于我，和这个站的来历 →」链接）。5 张 portrait 真人照全部 760×1140 JPEG progressive、单张 80~168 KB，体积克制。sitemap 正确收录 `/zh/about/`。`_site/toolbox/forest/index.html` 438 KB（较 7-10 的 406 KB 涨 **32 KB**，对应 forest 净 +452 行——上线前审查修 14 处 + 后续 4 组 + 「grow」暗号补种控制台 + 灵活模式 ∞ 不限时正计时无失败锁松树等）。`_notes/` 全 270 篇 md **仍 100% 覆盖 `keywords:`**（`grep -rL '^keywords:' _notes/` 空）。`toolbox/forest/index.html` 的 `console.log|debugger|TODO|FIXME|XXX` **仍全 0 命中**（净化住）。`_paid/` + `_flight-staging/` 在 `_config.yml` L50/L52 exclude 稳固、`find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）。
>
> **今日 1 项自动修复**（详见下方）——`452797e` 引入的自写教材书架用 `where: "author", "Rui Zhou"` 作筛选信号，但 `_notes/study/econ-math-toolkit/econ-math-toolkit.md` 单独用 `author: "周睿"` 中文名，导致这本 447 页 XeLaTeX 自写教材**既不在书架、又在下方树里作为「课程块」重复出现**——违反 `618d4c0` commit body「自写教材=书架 / 其余=树，各司其职不重复」的明确设计意图；且 `452797e` commit body 声明「现 7 本」但实际仅渲染 5 本，此 fix 补齐一本至 6 本。改动最小、无争议、可验证。
>
> **P0 承接**：⚠ 承接 7-07 / 7-08 / 7-09 / 7-10 的 **forest / ledger / pindou 三个工具的 maskable PWA 图标与主 icon `byte-identical`**（今日**第 5 日承接**）。`md5sum` 三对文件与前四日一字不差：`forest-icon-{512,maskable-512}.png` 都是 `63df7becb4ddc57e2b95e88305a33a18`、`ledger-icon-{512,maskable-512}.png` 都是 `fad6da15326e5fbf54adb03663f78be2`、`pindou-icon-{512,maskable-512}.png` 都是 `fed25167c04f65fc5ce80f28bd12ddf6`。Android launcher 圆形遮罩仍会裁掉外圈金环。本 agent 不擅动（需图形工具重画、涉及美术判断）。
>
> **P1 承接**：唯一 P1 仍是承接 6-13 的 `_config.yml`.`study_order` 未列 `interm-econometrics`（今日**第 29 日承接**）。核对：`_notes/study/` 26 个目录、`study_order` 25 条，差集仍只 `interm-econometrics` 一条。今日站主上线自写教材书架**之后**，`interm-econometrics-2023.md` 现在在 `/notes/` 顶部**书架**里已可见（作者 Rui Zhou 命中筛选、进书架 6 卡之一），但下方按 `discipline` 分组渲染的传统树里仍因 `study_order` 缺该 slug 而无法在**同一份 landing 页**上以「课程块」形式出现。是**否**仍算 P1、还是被自写教材书架的引入部分解决 —— 请你拍板。仓库里最久的 P1，仍未做 IA 决策。
>
> **P2 新观察**：① **7-11 冲刺日新增内容 & 新页面需 6 组合真机验收**——iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + PWA standalone 下确认：(a) 新 `/zh/about/` 页 hero 两栏在 620px 断点降为单栏且 portrait 收敛到 `max-width: 220px`、(b) `zh/index.html` 首页 hero 照片堆叠的 3 张预渲染窗口在极慢网络下不会闪白、(c) 「点一下 / Enter / →」翻页在 reduce-motion 下即时切换、(d) 新 `404.html` 在真实 404 场景（如 `/foo`）下 GitHub Pages 是否命中此页 vs 系统默认（Jekyll 会渲染 `_site/404.html`，但 GitHub Pages 也可以覆盖）、(e) forest 新加的「grow」暗号补种控制台在移动端触屏无键盘时如何触发（键序 `g-r-o-w` 显然不好按）、(f) forest「∞ 不限时·灵活模式」的松树是否稳定只在灵活会话出现。② **`docs/workflows/*.workflow.js` 内含站主本机绝对路径 `/Users/zhourui/Desktop/…`**（今日重新扫出）——`docs/workflows/econ-math-write-part.workflow.js` L11 `/Users/zhourui/Desktop/ruizhou03.github.io/files/econ-math-toolkit/source`、`body-to-latex.workflow.js` L11-13 同类三条、`figures-to-tikz.workflow.js` L9-11 三条，`docs/ARCHITECTURE_REVIEW.md` L12 一条 `file:///Users/zhourui/.claude/…`。`docs/` 在 `_config.yml` L34 exclude 内，不会打包到 `_site/`——不是站上外泄，但作为**仓库层面的本机隐私痕迹**（暴露站主 macOS 用户名 `zhourui`、桌面路径习惯）已可被路人 git clone 后 grep 到；建议改成相对路径或 `${HOME}/…` 或 `REPO_ROOT` 变量。属可清理项、非「小而无争议」范畴（涉及脚本可运行性判断），交你拍板。③ **`452797e` 书架 commit 声明「现 7 本」但今日修完只有 6 本**——commit body 列的「线代 / 线代Strang / 货币 / 中级计量 / 中级宏观中英 / 策略与博弈」7 项里，(i) 「线代」（不含 Strang 那本）在 `_notes/study/linear-algebra/` 下**没有**独立自写讲义文件（只有 `linear-algebra-strang.md` 一本，就是「线代 Strang」）；(ii) 「策略与博弈」在 `_notes/study/game-theory/` 下**没有**任何 `author: "Rui Zhou"` 的自写讲义（仅课程测评 / 真题 / 作业等）。commit body 与实际数据不符：要么 commit body 措辞将来时（计划中的 7 本）、要么两本本该在本仓库但没写完 / 命名不一致。请你回忆一下当初的意图。
>
> **P2 承接**：承接 7-10 全部 P2（forest 两轮对抗式审查修复 6 处的六组合真机验收 6 项 / 建议把「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` 或新建 `docs/adversarial-review.md`、以及从 7-07 承接的 forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收 + `scripts/audit/maskable_icon_consistency.py`、7-06 承接的 forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名共 27 条）——今日无消除、承接不变。
>
> **仓库卫生**：目录结构与文件架构**较昨日显著变化**——今日新增 `zh/about.html` + `404.html` + 5 张 portrait JPG + 17 处大型前端 / CSS / layout / 工具 HTML 改动。工作树纯净（`git status` 只有本 agent 修的一行、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空、无 5 MB+ 新二进制）。大文件核对：`files/or/or-2023.pdf` 5.3 MB 唯一 5 MB+、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB + `files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB + `pdfjs/build/pdf.worker.mjs` 仍 2 MB+ 群，与 7-10 一致。5 张新 portrait 每张 ≤ 168 KB、progressive JPEG，体积克制。`_paid/` + `_flight-staging/` 在 `_config.yml` exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。**结论**：仓库架构显著扩张但每个新文件都名副其实、目录归属正确、体积克制，无需再优化。

### ✅ 本次已自动修复

1. **`_notes/study/econ-math-toolkit/econ-math-toolkit.md` 的 `author` 字段从 `"周睿"` 改为 `"Rui Zhou"`**（与其他 5 本自写讲义一致：`interm-econometrics-2023.md` / `interm-macro-2022.md` / `interm-macro-2022-zh.md` / `linear-algebra-strang.md` / `monetary-econ-2023.md` 都用 `"Rui Zhou"`）。此前该文件因作者名不匹配而**同时**违反两处 `where` 筛选：(a) `notes/index.html:99` 的自写教材书架 `where: "author", "Rui Zhou"` 漏掉它 → 447 页 XeLaTeX 自写「经济学博士的数学工具箱」不在书架；(b) `notes/index.html:321` 的树去重 `where_exp: "n.author != 'Rui Zhou'"` 也漏掉它 → 该课程块继续在下方树里以「经济学数学基础」出现，与 `618d4c0` commit body「自写教材=书架 / 其余=树，各司其职不重复」明确设计意图冲突。修完 `bundle exec jekyll build` ✅ 4.975 s，`_site/notes/index.html` 书架卡从 5 张升到 6 张（新增「经济学数学工具箱」皮面卡、`c-navy` 数学学科色）、下方树里 `econ-math-toolkit` 关键词 grep 命中 0（原课程块被 `folder_notes.size>0` 守卫整块跳过——因该 folder 只此一本自写讲义无其它资料）。改动 1 文件 / 1 行、非破坏性、可复原、可 `git diff` 验证。中英名共存的作者字段不一致本身是历史遗留（该 md 2026-06-27 落库、比自写书架的引入早 14 天）；今日改法与今日新引入的书架 filter 契约对齐。

### 📋 待你把关

#### P0（紧急）

1. **forest / ledger / pindou 三个工具的 maskable PWA 图标与主 icon 仍 `byte-identical`**（**承接 7-07 / 7-08 / 7-09 / 7-10，第 5 日承接**）。今日再次 `md5sum` 核验三对文件 md5 与前四日相同：`forest-icon-512.png` 与 `forest-icon-maskable-512.png` 都是 `63df7becb4ddc57e2b95e88305a33a18`、`ledger-icon-512.png` 与 `ledger-icon-maskable-512.png` 都是 `fad6da15326e5fbf54adb03663f78be2`、`pindou-icon-512.png` 与 `pindou-icon-maskable-512.png` 都是 `fed25167c04f65fc5ce80f28bd12ddf6`。`5c58756` commit body 承诺的 v2「maskable 主体收进 80% 安全圆」实际未落地——Android launcher 圆形遮罩仍会裁掉外圈金环 / 装饰。请重新生成三张真正带 80% 安全圆的 maskable-512.png 覆盖。**本 agent 不擅动**：需要图形工具重画、涉及美术判断。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 ~ 7-10，**第 29 日承接**）。今日核对：`ls _notes/study/` 仍 26 个目录、`study_order` 仍 25 条，`comm -23` 差集仍只 `interm-econometrics` 一条。**但今日随自写教材书架上线（`452797e`），`interm-econometrics-2023.md` 现在在 `/notes/` 顶部书架里**已作为 6 卡之一可见（作者 Rui Zhou 命中书架筛选）；下方按 `discipline` 分组渲染的传统树里仍因 `study_order` 缺该 slug 而无课程块。是否仍算 P1、还是被自写教材书架的引入部分解决 —— 请你拍板：保留现状 / 加进 `study_order` 让下方树里也出现 / 改与 `interm-metrics/` 合并。仓库里最久的 P1。

#### P2（建议）

1. **7-11 冲刺日新增页面与 forest / 首页迭代需 6 组合真机验收**（今日新观察）—— iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + PWA standalone 六组合下确认：(a) 新 `/zh/about/` 页 hero 两栏在 620px 断点降为单栏且 portrait 收敛到 `max-width: 220px`、(b) `zh/index.html` 首页 hero 照片堆叠的 3 张预渲染窗口在极慢网络下不会闪白 / 回收时能顺利递补下一张、(c) 「点一下 / Enter / →」翻页在 `prefers-reduced-motion` 下即时切换、(d) 新 `404.html` 在真实 404 场景下 GitHub Pages 是否命中此页（Jekyll `permalink: /404.html` 已生成、GitHub Pages 会用它作为 404 页；本地无法验证）、(e) forest 新加的「grow」暗号补种控制台在移动端触屏无键盘时如何触发（键序 `g-r-o-w` 显然只对桌面友好；建议加一个隐藏 tap-3-times 手势或 URL query 触发）、(f) forest「∞ 不限时·灵活模式」的松树是否稳定只在灵活会话出现、账户区分是否正确。沙箱无 GUI / 无触屏跑不了。

2. **`docs/workflows/*.workflow.js` 与 `docs/ARCHITECTURE_REVIEW.md` 里含站主本机绝对路径 `/Users/zhourui/…`**（今日新观察）—— `grep -rn "/Users/\|/home/user/"` 命中 10 处：`docs/workflows/econ-math-write-part.workflow.js:11` / `docs/workflows/body-to-latex.workflow.js:11-13`（3 处）/ `docs/workflows/figures-to-tikz.workflow.js:9-11`（3 处）/ `docs/ARCHITECTURE_REVIEW.md:12`（`file:///Users/zhourui/.claude/…`）+ `_notes/research/reproducible-project.md:82,99` 两处示例代码 `setwd("/Users/zircon/Dropbox/…")` 与 stata `global root "/Users/zircon/…"`（后两处是「反面教材」故意展示，可豁免）。`docs/` 在 `_config.yml` L34 exclude 内、不会打包到 `_site/`——不是站上外泄，但**仓库层面**已可被 git clone 后 grep 到，暴露站主 macOS 用户名 `zhourui` 与桌面路径习惯。改法：workflow.js 里的 4 条硬编码路径改成 `path.resolve(__dirname, '..', '..', 'files/…')` 或 `process.env.REPO_ROOT`，`docs/ARCHITECTURE_REVIEW.md:12` 改成 `~/.claude/…` 或删掉这行本机链接。本 agent 不擅动：workflow.js 是需要真机跑的自动化脚本、改路径涉及脚本可运行性判断，非「小而无争议」范畴。

3. **`452797e` 书架 commit 声明「现 7 本」但今日修完只有 6 本**（今日新观察）—— commit body 列的「线代 / 线代Strang / 货币 / 中级计量 / 中级宏观中英 / 策略与博弈」7 项里，(i) 「线代」（不含 Strang 那本）在 `_notes/study/linear-algebra/` 下**没有**独立自写讲义 md 文件（只有 `linear-algebra-strang.md` 一本，就是「线代 Strang」）；(ii) 「策略与博弈」在 `_notes/study/game-theory/` 下**没有**任何 `author: "Rui Zhou"` 的自写讲义（仅课程测评 / 真题 / 作业等）。commit body 与实际数据不符：要么 commit body 是将来时（计划中的 7 本、还没写完两本）、要么两本本该在本仓库但没落库 / 命名不一致 —— 请你回忆当初意图并补齐或修 commit body 表述。

4. **承接 7-10 全部 P2**（forest 两轮对抗式审查修复 6 处的六组合真机验收 6 项 / 建议把「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` 或新建 `docs/adversarial-review.md`、以及从 7-07 承接的 forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收 + `scripts/audit/maskable_icon_consistency.py`、7-06 承接的 forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名共 27 条）——今日无新观察消除、承接不变。

### 🗂 仓库卫生

**目录结构与文件架构较昨日显著扩张**——27 个 commit 里 7 个新增文件（`404.html` 、`zh/about.html`、`files/zh/images/portrait-boya.jpg` / `portrait-guanghua.jpg` / `portrait-huabiao.jpg` / `portrait-stair.jpg` / `portrait-window.jpg`）+ 17 处大型前端 / CSS / layout / 工具 HTML 改动、0 个文件删除 / 重命名。工作树纯净（`git status` 只有本 agent 修 econ-math-toolkit.md 一行、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空、无 5 MB+ 新二进制）。5 张新 portrait 每张 760×1140 progressive JPEG、80~168 KB / 张、总计 559 KB，体积克制、命名规范（`portrait-<地点>.jpg`）；`404.html` 66 行 inline CSS、跟 zh/about 一样属自足页面。大文件核对与 7-10 完全一致：`files/or/or-2023.pdf` 5.3 MB 唯一 5 MB+、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB + `files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB + `pdfjs/build/pdf.worker.mjs` 仍是 2 MB+ 群。`_paid/` + `_flight-staging/` 在 `_config.yml` L50/L52 exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）等所有内部产物。**结论**：仓库架构显著扩张但每个新文件都名副其实、目录归属正确、体积克制，无需再优化。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点承接沙箱无 fly.io 出口现象、不阻塞巡检、未主动重启 fly app。**今日 27 个新 commit 全部前端 / 内容 / CSS / layout / 工具 HTML / 图片**，无后端 / 依赖变化。

---

## 2026-07-10

> 例行无人值守巡检：build 健康度 + 仓库卫生。距 7-09 巡检共 **0 个新 commit**——`git log f933da9..HEAD` 空、`git log --oneline -5` 头仍是 `f933da9 chore(daily-review): 2026-07-09 自动巡检`。工作区自 7-09 上一次 routine 落地后**继续完全静止**——0 文章 / 0 IA / 0 `_data/` / 0 `_config.yml` / 0 `_notes/` / 0 `files/` / 0 前端 / 0 二进制变动。这是本 routine 自 5-27 常态化以来**连续第二日**遇到「距上一次巡检 0 commit」的日子——站主整休状态持续。
>
> **build 健康度**：`bundle install` ✅（`Bundle complete! 7 Gemfile dependencies, 39 gems now installed.`）+ `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（**14.544 s cold build**）。`_site/` 顶层 26 项与 7-08 / 7-09 完全一致（`CNAME` `account` `admin` `admin-manifest.json` `assets` `assistant-fulltext.json` `assistant-index.json` `en` `essays` `feed.xml` `files` `flight` `google5306…` `index.html` `life` `manifest.json` `notes` `pdfjs` `redirects.json` `research` `robots.txt` `search.json` `sitemap.xml` `sw.js` `toolbox` `zh`）。`_site/toolbox/forest/index.html` 415967 B（**406 KB**，与 7-08 的 406 KB 一字不差）。`_notes/` 全 270 篇 md **仍 100% 覆盖 `keywords:`**（`grep -rL '^keywords:' _notes/` 空），搜索体系闭环。`toolbox/forest/index.html` 的 `console.log|debugger|TODO|FIXME|XXX` **仍全 0 命中**。`_paid/` + `_flight-staging/` 双双在 `_config.yml` L50/L52 exclude 列表内且 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空——双保险仍稳固。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）。
>
> **今日 0 项自动修复**——本仓库距上次巡检未发生任何改动，无可修可议之处；一切承接项按原优先级持续挂在待办栏。
>
> **P0 承接**：⚠ 承接 7-07 / 7-08 / 7-09 的 **forest / ledger / pindou 三个工具的 maskable PWA 图标与主 icon `byte-identical`**（今日**第 4 日承接**）。今日再次 `md5sum` 核验：`forest-icon-512.png` 与 `forest-icon-maskable-512.png` 都是 `63df7becb4ddc57e2b95e88305a33a18`、`ledger-icon-*` 都是 `fad6da15326e5fbf54adb03663f78be2`、`pindou-icon-*` 都是 `fed25167c04f65fc5ce80f28bd12ddf6`——三对 md5 与前三日一字不差。Android launcher 圆形遮罩仍会裁掉外圈金环 / 装饰。本 agent 不擅动（需要图形工具重画、涉及美术判断）。
>
> **P1 承接**：唯一 P1 仍是承接 6-13 的 `_config.yml`.`study_order` 未列 `interm-econometrics`（今日**第 28 日承接**）。`ls _notes/study/` 仍 26 个目录 vs `study_order` 25 条、`comm -23` 差集仍只 `interm-econometrics` 一条——纯 IA 设计判断，不擅动。仓库里最久的 P1，已挂 28 日。
>
> **P2 承接**：承接 7-09 全部 P2（forest 两轮对抗式审查修复 6 处的六组合真机验收 6 项 / 建议把「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` 或新建 `docs/adversarial-review.md`、以及从 7-07 承接的 forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收 + `scripts/audit/maskable_icon_consistency.py`、7-06 承接的 forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名共 27 条）——今日无新观察消除、无新观察加入，承接不变。
>
> **仓库卫生**：目录结构与文件架构**较昨日无变化**——0 commit、0 文件动，`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空、无 5 MB+ 新二进制、无 `.env` / 密钥类文件。大文件核对与 7-08 / 7-09 一字不差：`files/or/or-2023.pdf` 5.3 MB 唯一 5 MB+、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB + `files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB + `pdfjs/build/pdf.worker.mjs` 仍是 2 MB+ 群。**结论**：仓库结构较昨日无变化，无需再优化。

### ✅ 本次已自动修复

无。

连续第二日 0 新 commit、工作区完全静止；build ✅ / `_site/` 26 项结构与 7-08 / 7-09 一致 / workspace 干净——无任何低风险小修可做。

### 📋 待你把关

#### P0（紧急）

1. **forest / ledger / pindou 三个工具的 maskable PWA 图标与主 icon 仍 `byte-identical`**（**承接 7-07 / 7-08 / 7-09，第 4 日承接**）。今日再次 `md5sum` 核验三对文件 md5 一字不差与前三日相同：`forest-icon-512.png` 与 `forest-icon-maskable-512.png` 都是 `63df7becb4ddc57e2b95e88305a33a18`、`ledger-icon-512.png` 与 `ledger-icon-maskable-512.png` 都是 `fad6da15326e5fbf54adb03663f78be2`、`pindou-icon-512.png` 与 `pindou-icon-maskable-512.png` 都是 `fed25167c04f65fc5ce80f28bd12ddf6`。`5c58756` commit body 承诺的 v2「maskable 主体收进 80% 安全圆」实际未落地——Android launcher 圆形遮罩仍会裁掉外圈金环 / 装饰。请重新生成三张真正带 80% 安全圆的 maskable-512.png 覆盖。**本 agent 不擅动**：需要图形工具重画、涉及美术判断。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 ~ 7-09，**第 28 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、120 页 Wooldridge 体系英文讲义）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 仍 26 个目录、`study_order` 仍 25 条，`comm -23` 差集仍只 `interm-econometrics` 一条。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）仍属设计判断，请你拍板 —— 承接 28 日，是仓库里最久的 P1。

#### P2（建议）

1. **承接 7-09 全部 P2**（forest 两轮对抗式审查修复 6 处的六组合真机验收 6 项 / 建议把「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` 或新建 `docs/adversarial-review.md`、以及从 7-07 承接的 forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收 + `scripts/audit/maskable_icon_consistency.py`、7-06 承接的 forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名共 27 条）——今日无新观察消除、无新观察加入，承接不变。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化**——距上次巡检 0 commit、0 文件动。`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空、无 5 MB+ 新二进制。大文件核对与 7-08 / 7-09 一字不差。`_paid/` + `_flight-staging/` 在 `_config.yml` exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）。**按 CLAUDE.md「架构无变化即跳过深度优化」原则，仓库卫生本日无可动项**。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点承接沙箱无 fly.io 出口现象、不阻塞巡检、未主动重启 fly app。**今日 0 commit**，无前端 / 后端 / 依赖变化。

---

## 2026-07-09

> 例行无人值守巡检：build 健康度 + 仓库卫生。距 7-08 巡检共 **0 个新 commit**——`git log fc48bbe..HEAD` 空、`git log --oneline -5` 头仍是 `fc48bbe chore(daily-review): 2026-07-08 自动巡检`。工作区自 7-08 上一次 routine 落地后**完全静止**——0 文章 / 0 IA / 0 `_data/` / 0 `_config.yml` / 0 `_notes/` / 0 `files/` / 0 前端 / 0 二进制变动，仓库处于全新的「站主整休一天」状态。这是本 routine 自 5-27 常态化以来首次遇到「距上一次巡检 0 commit」的日子。
>
> **build 健康度**：`bundle install` ✅（首次冷装 39 gems 全成功）+ `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（13.258 s cold build）。`_site/` 顶层 26 项与 7-08 完全一致（`CNAME` `account` `admin` `admin-manifest.json` `assets` `assistant-fulltext.json` `assistant-index.json` `en` `essays` `feed.xml` `files` `flight` `google5306…` `index.html` `life` `manifest.json` `notes` `pdfjs` `redirects.json` `research` `robots.txt` `search.json` `sitemap.xml` `sw.js` `toolbox` `zh`）。`_notes/` 全篇 md **仍 100% 覆盖 `keywords:`**（`grep -rL '^keywords:' _notes/` 空），搜索体系闭环。`toolbox/forest/index.html` 的 `console.log|debugger|TODO|FIXME|XXX` **仍全 0 命中**。`_paid/` + `_flight-staging/` 双双在 `_config.yml` L50/L52 exclude 列表内且 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空——双保险仍稳固。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）。
>
> **今日 0 项自动修复**——本仓库距上次巡检未发生任何改动，无可修可议之处；一切承接项按原优先级持续挂在待办栏。
>
> **P0 承接**：⚠ 承接 7-07 / 7-08 的 **forest / ledger / pindou 三个工具的 maskable PWA 图标与主 icon `byte-identical`**（今日**第 3 日承接**）。今日再次 `md5sum` 核验：`forest-icon-512.png` 与 `forest-icon-maskable-512.png` 都是 `63df7becb4ddc57e2b95e88305a33a18`、`ledger-icon-*` 都是 `fad6da15326e5fbf54adb03663f78be2`、`pindou-icon-*` 都是 `fed25167c04f65fc5ce80f28bd12ddf6`——三对 md5 与前两日一字不差。Android launcher 圆形遮罩仍会裁掉外圈金环 / 装饰。本 agent 不擅动（需要图形工具重画、涉及美术判断）。
>
> **P1 承接**：唯一 P1 仍是承接 6-13 的 `_config.yml`.`study_order` 未列 `interm-econometrics`（今日**第 27 日承接**）。`ls _notes/study/` 仍 26 个目录 vs `study_order` 25 条、`comm -23` 差集仍只 `interm-econometrics` 一条——纯 IA 设计判断，不擅动。仓库里最久的 P1，已挂 27 日。
>
> **P2 承接**：承接 7-08 全部 P2（forest 两轮对抗式审查修复 6 处的六组合真机验收 6 项 / 建议把「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` 或新建 `docs/adversarial-review.md`、以及从 7-07 承接的 forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收 + `scripts/audit/maskable_icon_consistency.py`、7-06 承接的 forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名共 27 条）——今日无新观察消除、无新观察加入，承接不变。
>
> **仓库卫生**：目录结构与文件架构**较昨日无变化**——0 commit、0 文件动，`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空、无 5 MB+ 新二进制、无 `.env` / 密钥类文件。大文件核对与 7-08 一字不差：`files/or/or-2023.pdf` 5.3 MB 唯一 5 MB+、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB + `files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB 仍是 2 MB+ 二人组。**结论**：仓库结构较昨日无变化，无需再优化。

### ✅ 本次已自动修复

无。

距上次巡检 0 新 commit、工作区完全静止；build ✅ / `_site/` 26 项结构与 7-08 一致 / workspace 干净——无任何低风险小修可做。

### 📋 待你把关

#### P0（紧急）

1. **forest / ledger / pindou 三个工具的 maskable PWA 图标与主 icon 仍 `byte-identical`**（**承接 7-07 / 7-08，第 3 日承接**）。今日再次 `md5sum` 核验三对文件 md5 一字不差与前两日相同：`forest-icon-512.png` 与 `forest-icon-maskable-512.png` 都是 `63df7becb4ddc57e2b95e88305a33a18`、`ledger-icon-512.png` 与 `ledger-icon-maskable-512.png` 都是 `fad6da15326e5fbf54adb03663f78be2`、`pindou-icon-512.png` 与 `pindou-icon-maskable-512.png` 都是 `fed25167c04f65fc5ce80f28bd12ddf6`。`5c58756` commit body 承诺的 v2「maskable 主体收进 80% 安全圆」实际未落地——Android launcher 圆形遮罩仍会裁掉外圈金环 / 装饰。请重新生成三张真正带 80% 安全圆的 maskable-512.png 覆盖。**本 agent 不擅动**：需要图形工具重画、涉及美术判断。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 ~ 7-08，**第 27 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、120 页 Wooldridge 体系英文讲义）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 仍 26 个目录、`study_order` 仍 25 条，`comm -23` 差集仍只 `interm-econometrics` 一条。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）仍属设计判断，请你拍板 —— 承接 27 日，是仓库里最久的 P1。

#### P2（建议）

1. **承接 7-08 全部 P2**（forest 两轮对抗式审查修复 6 处的六组合真机验收 6 项 / 建议把「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` 或新建 `docs/adversarial-review.md`、以及从 7-07 承接的 forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收 + `scripts/audit/maskable_icon_consistency.py`、7-06 承接的 forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名共 27 条）——今日无新观察消除、无新观察加入，承接不变。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化**——距上次巡检 0 commit、0 文件动。`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空、无 5 MB+ 新二进制。大文件核对与 7-08 一字不差。`_paid/` + `_flight-staging/` 在 `_config.yml` exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）。**按 CLAUDE.md「架构无变化即跳过深度优化」原则，仓库卫生本日无可动项**。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点承接沙箱无 fly.io 出口现象、不阻塞巡检、未主动重启 fly app。**今日 0 commit**，无前端 / 后端 / 依赖变化。

---

## 2026-07-08

> 例行无人值守巡检：build 健康度 + 仓库卫生。距 7-07 巡检共 **2 个 commit**（`089809f` 之后 → `40f0449` 为止），**0 文章 / 0 IA / 0 `_data/` / 0 `_config.yml` / 0 `_notes/` / 0 `files/` 改动**——2 个 commit 全部锁在 `toolbox/forest/index.html`（+30 / -5 行），围绕**forest 双轮「对抗式审查」逮修 6 处交互死路 / 状态污染 / 时序缺陷**：
>
> ① `f04e964 fix(forest)`：第一轮对抗式审查逮修 3 处（+19 / -1）——(a) **休息时长行的 `hidden` 属性被 `.setting-row{display:flex}` 压掉**（作者样式必然盖过 UA 的 `[hidden]`，番茄开关切换毫无效果），补 `.setting-row[hidden]{display:none!important}`；commit body 明写「ledger/pet 修过同款坑」，属站内已知模式复发。(b) **灌溉/培养临时锁 `state.duration` 为复活成本期间，改树种 / 番茄开关 / 休息分钟会触发 `savePrefs` 把复活成本当「常用时长」写进偏好、下次访问恢复出来**，锁定期间改为保留上次存的真实时长。(c) **森林视图从未打开时 `clientWidth === 0`，种树按 800px 兜底算列数（9 列）→ 手机上首次进森林页会触发越界重排搅乱手工摆位**，`init` 时以 `visibility:hidden` 显示一帧量出真实田宽做种子。commit body 附带 `node --check + vm 初始化 + 路由/renderTree 行为断言全过` 的验证记录。
>
> ② `40f0449 fix(forest)`：第二轮对抗式审查逮修 3 处庆典/收遮罩时序缺陷（+11 / -4）——(a) **庆典 1050ms 窗口内键盘可触发新专注、随后 `closeFn` 把新会话的遮罩关掉**（交互死路：计时在跑却没有暂停/放弃入口），开始按钮改为庆典结束才解锁、且 `closeNow` 发现已有新会话时不再关遮罩。(b) **庆典期间「放弃这棵」仍可点：树已种成却弹「这棵树会枯萎」的假警告**，give-up 处理器补「无会话即返回」守卫（grace 停链分支不受影响）。(c) **放弃/结束循环两条退出路径在 0.35s 淡出中同步 `renderTree(0)`，半大树肉眼可见闪缩成小芽**——对齐完成路径：舞台立即重置、遮罩树等淡出结束（420ms、带新会话守卫）再重置。commit body 明写「两轮审查共 6 findings、12 票反驳式核验全数确认，CSS 级联维度零发现」。
>
> **两轮的意义**：这 2 个 commit 是站主开着 Claude Fable 5 走「对抗式审查 → 反驳式核验」自动化 QA 循环、把上周 7 天 40+ commit 深度打磨的 forest 双视图 App 里 6 处**逻辑正确但不容易在人肉手测里复现**的时序 / 状态污染缺陷全部逮出来修好——修复类型高度典型：`[hidden]` 被作者样式盖（第 3 次在本站发生：ledger、pet、forest）、临时状态写进偏好污染下次会话、`clientWidth === 0` 兜底算错列宽越界重排、庆典 / 遮罩 / 淡出的**时序窗口内**可以点到「不该点」的按钮 / 触发不该发生的重置。所有修复本身都是无争议的最小改动、有可验证脚本 / 断言支撑，不是设计取向决策。
>
> **build 健康度**：`bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（8.715 s cold build）。`_site/toolbox/forest/index.html` 406 KB（源 6386 行 / 172 KB → Jekyll layout 注入后 406 KB），渲染完整；`_site/toolbox/index.html` grep `/toolbox/forest/` 命中正常；`_site/sitemap.xml` grep `toolbox/forest` 命中 1、`_site/search.json` grep `forest` 命中 2 —— 搜索体系闭环。`_notes/` 全 270 篇 md **全部含 `keywords:` 字段**（`grep -rL '^keywords:' _notes/` 空），搜索体系 100% 覆盖。`grep console.log|debugger|TODO|FIXME|XXX` 在 `toolbox/forest/index.html` **全 0 命中**；全仓库 tracked 文件 `debugger|FIXME|XXX` 命中 5 个但全部是无害内容——`_includes/paywall.html:41` 是 `placeholder="ZRC-XXXX-XXXX"`、`_includes/toolbox/pet/modals.html:101` 是宠物码占位符 `XXXXXX`、`assets/js/games/tiaoqi.js:1773` 与 `toolbox/feixingqi/index.html:2932` 是英文注释里 `?room=XXXX invite link` 字面量、`scripts/sim-gomoku.js:53-58` 是五子棋 `XXXXX / .XXXX.` 棋形字面量；`assets/js/pet.js:5` 仍是唯一有意的品牌 log。**未发现 `_flight-staging/` / `_paid/` 泄露**——`_config.yml` L50/L52 exclude 双保险仍稳固。
>
> **今日 0 项自动修复**——2 个 commit 全部由站主 + Claude Fable 5 亲手完成的对抗式审查修复，属高质量代码审查 + 时序缺陷的判断性修复；build 健康、`_site/` 结构无异常、workspace 干净（`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空、无 5 MB+ 新二进制、无 `.env` / 密钥类文件），无任何低风险小修可做。
>
> **P0 承接**：⚠ 承接 7-07 的 **forest / ledger / pindou 三个工具的 maskable PWA 图标与主 icon `byte-identical`**（今日再次核验：`md5sum` 三对文件仍 identical，`forest-icon-512.png` 与 `forest-icon-maskable-512.png` 都是 `63df7becb4ddc57e2b95e88305a33a18`、`ledger-icon-*` 都是 `fad6da15…`、`pindou-icon-*` 都是 `fed25167…`）——`5c58756` commit body 承诺的 v2 「maskable 主体收进 80% 安全圆」实际未落地，站主本地渲染出的独立 maskable 文件在 commit 时被主 icon 复制覆盖（或反过来）。Android launcher 圆形遮罩仍会裁掉外圈金环 / 装饰。今日无法自动修复（需要图形工具重画、涉及美术判断）。承接 2 日。
>
> **P1 队列**：唯一 P1 仍是承接 6-13 的 `_config.yml`.`study_order` 未列 `interm-econometrics`（今日**第 26 日承接**），`_notes/study/interm-econometrics/interm-econometrics-2023.md` 仍在，`ls _notes/study/` 26 个目录 vs `study_order` 25 条差集仍只此一条——纯 IA 设计判断，不擅动。仓库里最久的 P1。
>
> **P2 队列**：今日新增两条 P2 新观察：⑨ **forest 两轮对抗式审查修复 6 处后需要真机 6 组合下的回归确认**——iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + PWA standalone 六组合下确认：(a) 番茄开关切换后休息时长行确实隐藏 / 显现（`f04e964#a` [hidden] 属性被 !important 强制）、(b) 灌溉 / 培养期间改树种 / 番茄开关 / 休息分钟、再退出到普通会话后「常用时长」仍是复活前的真实值（`f04e964#b` state.duration 污染防线）、(c) 手机首次冷启动直接进 `#forest` 独立视图后再回主页 → 森林田宽 / 列数正确、无越界重排（`f04e964#c` clientWidth=0 兜底路径已断），(d) 长时番茄 25/45/90min 结束播放庆典的 1050ms 窗口内按空格 / Enter / 数字键都无法触发新专注（`40f0449#a` 交互死路），(e) 庆典期间「放弃这棵」按钮已被守卫拦截、不再弹「这棵树会枯萎」假警告（`40f0449#b`）、(f) 放弃 / 结束循环退出时半大树能完整走完 0.35s 淡出后再重置为小芽、不再肉眼可见闪缩（`40f0449#c`）。沙箱无 GUI / 无触屏跑不了。⑩ **建议把「对抗式审查 → 反驳式核验」自动化 QA 循环写进仓库工作流文档**（今日新观察）——本次 2 个 commit 的 body 展示了这套流程的可复现性：先跑对抗式审查列出 findings（第一轮 3、第二轮 3、第二轮附加维度 CSS 级联零发现），再走 12 票反驳式核验确认 findings 真实，最后可用 `node --check + vm 初始化 + 断言` 做无浏览器的行为验证。这套流程能补上「无 GUI / 无触屏沙箱跑不了真机 QA」的巡检盲区、并把此前几十天承接的 P2 真机验收清单里的**逻辑正确性**部分转成本地可自动验证；建议在 `MAINTENANCE.md` 或新建 `docs/adversarial-review.md` 里写下 prompt 模板 + 反驳票数阈值 + `node --check + vm` 断言姿势。本次不擅动：属新增工作流文档 / 决策，非「小而无争议」范畴。
>
> **P2 承接**：承接 7-07 全部 P2（含 forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收、forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名、7-07 P2#2 建议加 `scripts/audit/maskable_icon_consistency.py` 共 27 条）——今日无新观察消除、承接不变。
>
> **仓库卫生**：目录结构与文件架构**较昨日无变化**——2 个 commit 全部锁在 `toolbox/forest/index.html`（+30 / -5 行、净 +25），未新增 / 未删除任何目录、未新增 / 未删除任何 `_notes/` / `_data/` / `files/` 条目、**未引入任何二进制**（今日纯前端 JS/CSS 补丁）。工作树纯净（`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空、无 5 MB+ 新二进制）。大文件核对与 7-07 完全一致：`files/or/or-2023.pdf` 5.3 MB 唯一 5 MB+、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB + `files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB 仍是 2 MB+ 二人组。`_paid/` + `_flight-staging/` 双双在 `_config.yml` L50/L52 exclude 列表内且 `_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空—— 双保险仍稳固。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）等所有内部产物。**结论**：目录结构与文件架构与 7-07 完全一致，仅前端 JS 行内调整（+30 / -5），无仓库卫生可动项——按 CLAUDE.md「架构无变化即跳过深度优化」原则。

### ✅ 本次已自动修复

无。

2 个 commit 全部由站主 + Claude Fable 5 亲手完成的 forest 对抗式审查修复（两轮共 6 findings、12 票反驳式核验全数确认，CSS 级联维度零发现）—— 属高质量代码审查 + 时序缺陷的判断性修复，不属「小而无争议」范畴；build ✅ / `_site/` 结构与 7-07 完全一致 / workspace 干净 / 无低风险小修可做。

### 📋 待你把关

#### P0（紧急）

1. **forest / ledger / pindou 三个工具的 maskable PWA 图标与主 icon 仍 `byte-identical`**（**承接 7-07，第 2 日承接**）。今日再次 `md5sum` 核验：`forest-icon-512.png` 与 `forest-icon-maskable-512.png` 都是 `63df7becb4ddc57e2b95e88305a33a18`、`ledger-icon-*` 都是 `fad6da15326e5fbf54adb03663f78be2`、`pindou-icon-*` 都是 `fed25167c04f65fc5ce80f28bd12ddf6`。`5c58756` commit body 承诺的 v2 「maskable 主体收进 80% 安全圆（外径 181px < 204.8px，圆蒙版合成验证）」实际未落地——站主本地渲染出的独立 maskable 文件在 commit 时被主 icon 复制覆盖（或反过来）。Android launcher 圆形遮罩仍会裁掉外圈金环 / 装饰。请重新生成三张真正带 80% 安全圆的 maskable-512.png 覆盖。**本 agent 不擅动**：需要图形工具重画、涉及美术判断（80% 安全圆内的构图取舍），非「小而无争议」修复。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 ~ 7-07，**第 26 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、120 页 Wooldridge 体系英文讲义）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 仍 26 个目录（较昨日不变）、`study_order` 仍 25 条，`comm -23` 差集仍只 `interm-econometrics` 一条。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）仍属设计判断，请你拍板 —— 承接 26 日，是仓库里最久的 P1。

#### P2（建议）

1. **forest 两轮对抗式审查修复的 6 处缺陷需真机 6 组合下回归确认**（今日新观察）—— iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + PWA standalone 六组合下确认：(a) 番茄开关切换后休息时长行确实隐藏 / 显现（`f04e964#a`）、(b) 灌溉 / 培养期间改设置、退出后「常用时长」仍是复活前真实值（`f04e964#b` 偏好污染防线）、(c) 手机首次冷启动直接进 `#forest` 独立视图后回主页 → 田宽 / 列数正确、无越界重排（`f04e964#c`）、(d) 长时番茄 25/45/90min 结束播放庆典的 1050ms 窗口内空格 / Enter / 数字键无法触发新专注（`40f0449#a` 交互死路）、(e) 庆典期间「放弃这棵」按钮不再弹「树会枯萎」假警告（`40f0449#b`）、(f) 放弃 / 结束循环时半大树能完整走完 0.35s 淡出、不再肉眼可见闪缩为小芽（`40f0449#c`）。沙箱无 GUI / 无触屏跑不了。

2. **建议把「对抗式审查 → 反驳式核验」自动化 QA 循环写进仓库工作流文档**（今日新观察）—— 本次 2 个 commit body 展示了这套流程的可复现性：先跑对抗式审查列出 findings（本次两轮各 3 findings + 第二轮 CSS 级联维度零发现），再走 12 票反驳式核验确认 findings 真实，最后用 `node --check + vm 初始化 + 路由 / renderTree 行为断言` 做无浏览器的本地验证。这套流程能补上「无 GUI / 无触屏沙箱跑不了真机 QA」的巡检盲区、并把此前几十天承接的 P2 真机验收清单里的**逻辑正确性**部分转成本地可自动验证；建议在 `MAINTENANCE.md` 或新建 `docs/adversarial-review.md` 里写下 prompt 模板 + 反驳票数阈值 + `node --check + vm` 断言姿势。本次不擅动：属新增工作流文档 / 决策，非「小而无争议」范畴。

3. **承接 7-07 全部 P2**（forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收 6 项 / 建议 `scripts/audit/maskable_icon_consistency.py`、以及 7-06 承接的 forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收 / bare_dollar / spotcheck 启发式漏判 / tutoring / paid-test-visa / mao-thought-principles summary / random hover 缩进 / mid-2015 / anova-R 互链 / 掼蛋联机回归 / 宠物中心多浏览器 / 机票监控 mac 端到端 / flight 5 HTML 多浏览器 / 经济学工具箱三项确认 / jukebox 问题首 / DNS NameResolutionError / dead_links SVG xmlns 误判 / connect4 canvas 无键盘落子 / linear-algebra-strang.md summary 引用 / `_flight-staging/` 命名共 27 条），今日无新观察消除、承接不变。

### 🗂 仓库卫生

**目录结构与文件架构较昨日无变化**——2 个 commit 全部锁在 `toolbox/forest/index.html`（+30 / -5 行、净 +25）；未新增 / 未删除任何目录、未新增任何二进制、未新增 / 未删除任何 `_notes/` / `_data/` / `files/` 条目。工作树纯净（`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空、无 5 MB+ 新二进制）。大文件核对与 7-07 完全一致。`_paid/` + `_flight-staging/` 在 `_config.yml` exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）。**按 CLAUDE.md「架构无变化即跳过深度优化」原则，仓库卫生本日无可动项**。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点承接沙箱无 fly.io 出口现象、不阻塞巡检、未主动重启 fly app。**今日 2 个 commit 全部前端 forest 补丁**（`toolbox/forest/index.html` +30 / -5），无后端 / 依赖变化。

---

## 2026-07-07

> 例行无人值守巡检：build 健康度 + 仓库卫生。距 7-06 巡检共 **7 个 commit**（`5245362` 之后 → `5c58756` 为止），**0 文章 / 0 IA / 0 `_data/` 内容 / 0 `_config.yml` / 0 `_notes/` / 0 `files/` 改动**——7 个 commit 全部锁在 `toolbox/forest/index.html`（+1285 / -724 行 / 6 commit）+ 4 张 forest PWA 图标（`5c58756` 唯一改二进制的 commit）+ `_data/toolbox.yml` 一行版本号，全部围绕**种树专注计时器再一天 7 连深度打磨**：
>
> ① `fd34767 fix(forest)`：主舞台小苗不再浮空——复刻遮罩同款前景地面带 + 树根坐地公式（+33 / -17）。② `f0eeb08 feat(forest)`：更多设置面板重组——分组、统一控件语言、偏好持久化（+179 / -129）。③ `a8a1c50 feat(forest)`：**「我的森林」拆成独立视图页**——hash 路由（`#/` / `#forest`）+ App 式底 tab 导航（+112 / -5）；从纯番茄计时器进化成「双视图 App」。④ `6f82ddc refactor(forest)`：整体 UI 打磨——暗色可用性 / 可达性 / token 落地 / 死代码瘦身（+77 / -278，净删 200 行，重构收紧）。⑤ `e33fd6c feat(forest)`：动画质感升级——持久摆动层 / 重建节流 / 交叉淡入 / 种成庆典（+156 / -26）。⑥ `9c3de13 feat(forest)`：**五主题场景与五树种美术精修整合**——+ 树的环境光适配（+731 / -273，本轮最大 commit，把 7-06 未收口的五主题呼吸动效 + 五树种专属装饰再一次整合升级，树随场景光变色）。⑦ `5c58756 feat(forest)`：**PWA 图标 v2——分层橡树冠 + 3/4 进度环，maskable 独立安全区版**（4 张 PNG 全部重画：apple-touch 6851 → 6433 B、192 7237 → 7091 B、512 20119 → 19036 B、maskable-512 20119 → 19036 B）；commit body 明写「maskable 修复：v1 与主图同文件、圆形遮罩会裁掉外圈金环；v2 主体收进 80% 安全圆」。
>
> 7 连之后 forest 已从 7-01 首发的番茄专注计时器进化为「双视图 App（种树 / 我的森林）+ 五主题呼吸场景 + 五树种美术精修 + PWA v2 图标」的完整产品，是站点近期最活跃工具（7-01 首发以来第 7 天迭代、40+ commit）。
>
> **build 健康度**：`bundle install` ✅ + `bundle exec jekyll build` ✅ 通过、零 warning、零 error（14.494 s cold build）。`_site/toolbox/forest/index.html` 408 KB（源 6361 行 / 172 KB → Jekyll layout 注入后 408 KB），渲染完整；`_site/toolbox/index.html` grep `/toolbox/forest/` 命中正常；`_site/sitemap.xml` + `_site/search.json` 均有 forest 条目——搜索体系闭环。`_notes/` 全 270 篇 md **全部含 `keywords:` 字段**（`grep -rL '^keywords:' _notes/` 空），搜索体系 100% 覆盖。`grep console.log|debugger|TODO|FIXME|XXX` 在 `toolbox/forest/index.html` **全 0 命中**（重构后彻底净化）；`assets/js/pet.js:5` 仅一条有意的品牌 log（`console.log('%c🐾 宠物中心 ' + BUILD_VERSION, ...)`）承接。**未发现 `_flight-staging/` / `_paid/` 泄露**——`_config.yml` L50/L52 exclude 双保险仍稳固。
>
> **今日 0 项自动修复**——7 个 commit 全部由站主亲手打磨的 forest 双视图 App / UI 打磨 / 动画质感 / 五主题美术 / PWA 图标 v2，均属 UX / 视觉 / 交互层设计取向决策，一律不属本 agent 应擅动的「小而无争议」范畴；build 健康、`_site/` 结构无异常、workspace 干净（`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` 全空、无 5 MB+ 新二进制、无 `.env` / 密钥类文件）、无任何低风险小修可做。
>
> **P0 新观察**：⚠ **`5c58756` PWA 图标 v2 提交声称已修好的 maskable「独立安全区版」实际未落地**——`assets/icons/forest-icon-maskable-512.png` 与 `assets/icons/forest-icon-512.png` **byte-identical**（md5 都是 `63df7becb4ddc57e2b95e88305a33a18`），commit 前也一样（`git show 5c58756~:` 两文件同样 identical）。commit body 明写「maskable 修复：v1 与主图同文件、圆形遮罩会裁掉外圈金环；v2 主体收进 80% 安全圆（外径 181px < 204.8px，圆蒙版合成验证）」，但落库的 maskable-512.png 仍与主 icon 完全一致——意味着 Android launcher 的圆形遮罩仍会把外圈金环裁掉、跟 v1 症状一样。**站主是不是本地渲染出了两张独立文件、上传时只覆盖了主 icon 或复制粘贴前搞混了？** 需要重新生成 maskable 版本（80% 安全圆内的主体单独渲染一张）并覆盖。同时发现历史遗留同类问题：**`assets/icons/ledger-icon-maskable-512.png` 与 `ledger-icon-512.png` 也 byte-identical**（8626 B / 8626 B），**`assets/icons/pindou-icon-maskable-512.png` 与 `pindou-icon-512.png` 也 byte-identical**——三个工具的 maskable icon 都是复制粘贴主 icon；对照 flight / pet / suika / 2048 / guandan 5 个工具的 maskable 都与主 icon 不同、才是正确姿态。**该 P0 属真实的 PWA 兼容性 bug**（在 Android launcher 应用圆形遮罩时会裁掉装饰），需要站主用图形工具重新导出三张真正带 80% 安全圆的 maskable PNG（不擅动的原因：需要设计工具重画、涉及美术判断，本 agent 不宜代做）。
>
> **P1 队列**：唯一 P1 仍是承接 6-13 的 `_config.yml`.`study_order` 未列 `interm-econometrics`（今日**第 25 日承接**），`_notes/study/interm-econometrics/interm-econometrics-2023.md` 仍在，`ls _notes/study/` 26 个目录 vs `study_order` 25 条差集仍只此一条——纯 IA 设计判断，不擅动。
>
> **P2 队列**：承接 7-06 全部 P2（含 forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名共 25 条）——今日无新观察消除、承接不变。今日新增两条 P2 新观察：⑦ **forest 7 连（双视图 App 拆分 + 五主题美术精修 + 动画质感 + PWA 图标 v2）之后真机 / PWA 验收清单再补 6 项**——iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + 「加装到主屏」PWA standalone 六组合下过流程并补：(a) hash 路由 `#/` ↔ `#forest` 在 PWA standalone 下前进/后退是否与主 App 期望一致（浏览器 back 键是否退到系统而非首页 tab）、(b) 底 tab 导航在 iPhone 底部安全区（Home indicator）下是否被遮挡、(c) 「我的森林」独立视图在冷启动 / 长时间后返回时是否正确恢复 hash 路由（有些 launcher 会重置 URL）、(d) 五树种随场景光的环境光适配在极暗（夜）和极亮（正午）主题下对比度是否够、(e) 「种成庆典」动画在长时番茄 25/45/90min 首次结束时的一次性播放是否顺滑、(f) v2 PWA 图标 apple-touch（180px、6433 B）在 iOS 主屏上的清晰度与 v1（6851 B）对比、以及 3/4 进度环端点小蓝点在小尺寸（48px）下是否消失。沙箱无 GUI / 无触屏跑不了。⑧ **`assets/icons/` 目录的 maskable icon 一致性建议加入 audit**——本次 grep 循环发现 forest / ledger / pindou 3 个工具的 maskable 与主 icon byte-identical、跟 flight / pet / suika / 2048 / guandan 5 个工具的正确姿态相反；建议在 `scripts/audit/` 加一个小 audit：对每个 tool 的 `*-icon-512.png` 与 `*-icon-maskable-512.png` 比较 md5，identical 即告警（避免此类 PWA 图标回归再次发生）；本次不擅动 scripts/audit/（属新增审计脚本、非小修范畴）。
>
> **仓库卫生**：目录结构与文件架构**较昨日无变化**——7 个 commit 全部锁在 `toolbox/forest/index.html` + 4 张 forest PWA 图标 + `_data/toolbox.yml` 1 行版本号，未新增 / 未删除任何目录、未新增 / 未删除任何 `_notes/` / `_data/` 条目、未引入新二进制文件（4 张 PNG 是**覆盖**同名旧文件，不算新增；且总体积略降：apple-touch -418 B + 192 -146 B + 512 -1083 B + maskable-512 -1083 B）。工作树纯净（`git status` clean、`git ls-files --others --exclude-standard` 空、无编辑器 / 系统垃圾 / `* 2.*` 副本 / `.env*` / `.log`）。大文件核对与 7-06 完全一致：`files/or/or-2023.pdf` 5.3 MB 唯一 5 MB+、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB + `files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB 仍是 2 MB+ 二人组。`_paid/` + `_flight-staging/` 双双在 `_config.yml` L50/L52 exclude 列表内且 `_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空—— 双保险仍稳固。`_config.yml` 的 `exclude:` 列表已含 `DAILY_REVIEW.md`（L15）、`EMAIL_SUMMARY.md` 等所有内部产物。**结论**：目录结构与文件架构与 7-06 完全一致，仅前端代码行内调整 + 4 张 PWA 图标覆盖 + 1 行版本号，无仓库卫生可动项——按 CLAUDE.md 规则「架构无变化即跳过深度优化」。

### ✅ 本次已自动修复

无。

7 个 commit 全部由站主亲手打磨的 forest 双视图 App / UI 打磨 / 动画质感 / 五主题美术精修 / PWA 图标 v2 —— 均属 UX / 视觉 / 交互层设计取向决策，不属「小而无争议」范畴；build ✅ / `_site/` 结构与 7-06 完全一致 / workspace 干净 / 无低风险小修可做。

### 📋 待你把关

#### P0（紧急）

1. **forest PWA 图标 v2 的 maskable 版实际未生效——落库文件与主 icon 仍 byte-identical**（今日新发现）。`5c58756` commit body 明说「maskable 修复：v1 与主图同文件、圆形遮罩会裁掉外圈金环；v2 主体收进 80% 安全圆（外径 181px < 204.8px，圆蒙版合成验证）」，但仓库里 `assets/icons/forest-icon-maskable-512.png` 与 `assets/icons/forest-icon-512.png` 两文件 md5 都是 `63df7becb4ddc57e2b95e88305a33a18`、`cmp` 显示 IDENTICAL、`git show 5c58756~:` 显示 commit 前也一样。意味着 Android launcher 的圆形遮罩仍会裁掉外圈金环，跟 v1 症状一样。**猜想**：本地渲染出了两张真的独立文件，但上传 / commit 时只把主 icon 复制过去覆盖了 maskable 那一张（或反过来）；也可能生成脚本的 maskable 分支没接对。请重新生成 maskable-512.png（内容主体收进 80% 安全圆内单独渲染）并覆盖。同类历史遗留：`ledger-icon-maskable-512.png` 与 `ledger-icon-512.png` 也 identical（8626 B / 8626 B）、`pindou-icon-maskable-512.png` 与 `pindou-icon-512.png` 也 identical——三个工具都有这问题，建议一并重画覆盖。**本 agent 不擅动**：需要图形工具重画、涉及美术判断（80% 安全圆内的构图取舍），非「小而无争议」修复。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 ~ 7-06，**第 25 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、120 页 Wooldridge 体系英文讲义、97 keywords 厚足覆盖）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 仍 26 个目录（较昨日不变）、`study_order` 仍 25 条，`comm -23` 差集仍只 `interm-econometrics` 一条。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）仍属设计判断，请你拍板 —— 承接 25 日，是仓库里最久的 P1。

#### P2（建议）

1. **`toolbox/forest/` 双视图 App 拆分（`a8a1c50`）+ 五主题美术精修（`9c3de13`）+ 动画质感升级（`e33fd6c`）+ v2 PWA 图标（`5c58756`）之后待真机 / PWA 六组合验收再补 6 项**（**今日新观察 + 承接 7-06 P2#1**）—— iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + 「加装到主屏」PWA standalone 六组合下过完整流程一遍并补：(a) hash 路由 `#/` ↔ `#forest` 在 PWA standalone 下前进/后退是否与主 App 期望一致（浏览器 back 键是否退到系统而非首页 tab）、(b) 底 tab 导航在 iPhone 底部安全区（Home indicator）下是否被遮挡、(c) 「我的森林」独立视图在冷启动 / 长时间后返回时是否正确恢复 hash 路由（有些 launcher 会重置 URL）、(d) 五树种随场景光的环境光适配在极暗（夜）和极亮（正午）主题下对比度是否够、(e) 「种成庆典」动画在长时番茄 25/45/90min 首次结束时的一次性播放是否顺滑、(f) v2 PWA 图标 apple-touch（180px、6433 B）在 iOS 主屏上的清晰度与 v1（6851 B）对比、以及 3/4 进度环端点小蓝点在小尺寸（48px）下是否消失。并叠加 7-06 P2#1 的 8 项与 7-05 P2#3 的 10 项。沙箱无 GUI / 无触屏跑不了。

2. **建议在 `scripts/audit/` 加 `maskable_icon_consistency.py`——对每个 tool 的 `*-icon-512.png` 与 `*-icon-maskable-512.png` md5 比较，identical 即告警**（今日新观察）。本次 grep 循环发现 forest / ledger / pindou 3 个工具的 maskable 与主 icon byte-identical，跟 flight / pet / suika / 2048 / guandan 5 个正确工具形成反差；若加入每日 audit 可避免此类 PWA 图标回归再次发生。本次不擅动：新增审计脚本属信息架构 / 工作流决策，请你确认要不要加。

3. **承接 7-06 全部 P2**（forest 7-06 主题氛围景观 10 连的 8 项真机验收 / pet 趋势图下载 + 全屏横向看图 6 项真机验收 / bare_dollar / spotcheck 启发式漏判 / tutoring / paid-test-visa / mao-thought-principles summary / random hover 缩进 / mid-2015 / anova-R 互链 / 掼蛋联机回归 / 宠物中心多浏览器 / 机票监控 mac 端到端 / flight 5 HTML 多浏览器 / 经济学工具箱三项确认 / jukebox 问题首 / DNS NameResolutionError / dead_links SVG xmlns 误判 / connect4 canvas 无键盘落子 / linear-algebra-strang.md summary 引用 / `_flight-staging/` 命名共 25 条），今日无新观察消除、承接不变。

### 🗂 仓库卫生

**目录结构与文件架构较昨日无变化**——7 个 commit 全部锁在 `toolbox/forest/index.html`（+1285 / -724 行、净 +561）+ 4 张 forest PWA 图标覆盖 + `_data/toolbox.yml` 1 行版本号；未新增 / 未删除任何目录、未新增任何全新二进制、未新增 / 未删除任何 `_notes/` / `_data/` / `files/` 条目。工作树纯净（`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空、无 5 MB+ 新二进制）。大文件核对与 7-06 完全一致。`_paid/` + `_flight-staging/` 在 `_config.yml` exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L15）。**按 CLAUDE.md「架构无变化即跳过深度优化」原则，仓库卫生本日无可动项**。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点承接沙箱无 fly.io 出口现象、不阻塞巡检、未主动重启 fly app。**今日 7 个 commit 全部前端 forest（HTML + PWA 图标 + toolbox.yml 版本号）**，后端无新增依赖、无对外流量增益。

---

## 2026-07-06

> 例行无人值守巡检：build 健康度 + 仓库卫生。距 7-05 巡检共 **11 个 commit**（`50a650c` 之后 → `e741f76` 为止），**0 文章 / 0 IA / 0 `_data/` / 0 `_config.yml` / 0 `_notes/` / 0 `files/` 改动**（`git diff --stat 50a650c..HEAD -- '*.md' '_data/*' '_config.yml' '_notes/**' 'files/**'` 空）——11 个 commit 全部锁在 4 个前端文件里：`toolbox/forest/index.html`（+2385 / -286 行 / 10 commit）、`_includes/toolbox/pet/board.html`（+34 / -0）、`assets/css/pet.css`（+41 / -0）、`assets/js/pet.js`（+212 / -9）—— 一条主线：
>
> ① **`toolbox/forest/` 种树专注计时器主题氛围景观再一波 10 连深度打磨**（`912a959` → `323b0dc` → `eceaf0e` → `b3c97eb` → `c538cde` → `4072c56` → `4cc6bd0` → `730e659` → `4d1d3f9` → `e741f76`）—— 承接 7-04（10 连产品化）+ 7-05（玩法 5 连深化）之后**再一天 10 commit** 从主题氛围景观层继续拉高美术：(a) **主题全部重做为氛围小景大图景 + 按钮小景**（912a959）—— 月夜 / 日出 / 极光 / 气泡 / 雨 / 星空 / 晴 7 主题从纯色板重画为「按钮上是小景、点开后是全屏氛围大图景」的双层预览体系；(b) **高级树装饰全重做——果实 / 灯串 / 小鸟 / 蝴蝶 / 落瓣**（323b0dc）—— 删掉之前 v3 的「廉价光晕光环」路线，改用高辨识度实物装饰（果实密度分布 / 灯串弧线走位 / 蝴蝶落点 / 樱花落瓣飘）拉开高级树档次；(c) **下架极光主题**（eceaf0e）—— 用户觉得极光「显廉价」直接下架；(d) **下架星空主题**（b3c97eb）—— 已有月夜主题，星空显冗余下架；(e) **整合上线 v1——主题呼吸动效 + 五树种专属装饰 + 新缩略图 + 樱花持续落樱**（c538cde）—— 大合并 commit（+1350 / -162 行），把前面几条路线整合上线；(f) **星点去掉十字光芒**（4072c56）—— 放大到全屏时那个「✛」像廉价准星，改成柔和圆点；(g) **夜景月亮去掉环形山圈点**（4cc6bd0）—— 还原成用户认可的干净月牙；(h) **5 主题专业化打磨上线**（730e659）—— 体积云 / 大气景深 / 月晕星尘 / 雨的地面水花 / 水下焦散 5 项专业渲染细节（+788 / -74，本次最大 commit）；(i) **专注遮罩沉浸布局上线**（4d1d3f9）—— 计时移顶部、树种在前景地面带上、落雨水花可见（专注全屏视觉重排）；(j) **专注遮罩场景铺满整屏**（e741f76）—— fix 收尾，删掉遗留的 `.focus-overlay svg` 一刀切尺寸规则让场景铺满不留边。10 连之后 forest 的主题氛围景观层从「基础色板 + 简单装饰」跃升为「按钮小景 + 全屏大图景 + 呼吸动效 + 5 主题专业渲染 + 沉浸布局」的完整景观美术体系；至今 forest 已连续 6 天迭代（7-01 首发 → 7-02 视觉打磨 → 7-04 产品化 10 连 → 7-05 玩法 5 连 → 7-06 主题氛围景观 10 连）共 40+ commit，是站点近期最活跃工具。 ② **`assets/js/pet.js` + `_includes/toolbox/pet/board.html` + `assets/css/pet.css` 宠物中心趋势图可下载 + 全屏横向看图**（`81dcfa9` 单 commit +284 / -12 行三文件联动）—— 新增两项功能：(A) **下载趋势图**：任何能点开的趋势视图（今日时段 24h / 近 7 日 / 近 30 日 / 近半年 / 近 1 年 / 自定义）都能一键存成图片。把当前 SVG 栅格化（解析掉 CSS 变量、按 2× 设备像素渲染保证清晰），合成一张卡片：宠物头像 + 名字、物种 / 年龄 / 体重 / 目标一行、区间名 + 具体日期范围、总量·日均汇总、站点署名与导出日期，文件名自动带宠物名与区间；(B) **全屏横向看图**：趋势区新增「⤢ 横屏」按钮，点开进全屏；手机竖屏时把面板旋转 90° 变成一块横屏画布，图更大、信息更清楚——顶部有完整区间 tab（今日 / 7 日 / 30 日 / 半年 / 1 年 / 自定义）、底部有今日逐日翻看（‹ 日期 › / 今天）与自定义起止日期，以及下载按钮；复用同一套渲染（把内嵌图每帧镜像到全屏 SVG，不重写绘制逻辑），Esc / ✕ 退出。区间切换重构出 `setTrendPeriod()` 供内嵌与全屏 tab 共用。是宠物中心继 7-04 客户端同步加固之后的第一个 UX 层新功能。
>
> `bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（13.927 s cold build）。`_site/` 顶层仍 **26 项**（与 7-05 / 7-04 / 7-03 / 7-02 完全一致：`CNAME` `account` `admin` `admin-manifest.json` `assets` `assistant-fulltext.json` `assistant-index.json` `en` `essays` `feed.xml` `files` `flight` `google5306…` `index.html` `life` `manifest.json` `notes` `pdfjs` `redirects.json` `research` `robots.txt` `search.json` `sitemap.xml` `sw.js` `toolbox` `zh`），未新增 / 未删减顶级路径。`_site/toolbox/forest/index.html` 364 KB（源 5801 行 / 163.5 KB → 200+ KB 前端源，一天 +2385 / -286 行主题氛围景观 10 连之后再次膨胀，Jekyll layout 注入后 364 KB），渲染完整；`_site/toolbox/index.html` grep `/toolbox/forest/` 命中 2 次（生活工具组 tool-card + bulk-offline shortcut）；`_site/sitemap.xml` + `_site/search.json` forest 各命中 —— 搜索体系闭环。`_site/toolbox/pet/index.html` grep `trend-fs` 命中 2 次（新增全屏横向看图容器 `<div class="trend-fs" id="trend-fs" hidden>` + `<svg id="trend-chart-fs">`）—— 全屏看图 UI 渲染到位。**未发现 `_flight-staging/` / `_paid/` 泄露**（`find _site -path "*_flight-staging*" -o -path "*_paid*"` 空）。**代码质量核对**：改动集中于 4 个前端文件，`grep "console.log\|debugger\|TODO\|FIXME\|XXX"` 仅 `assets/js/pet.js:5` 一条有意的品牌 log（`console.log('%c🐾 宠物中心 ' + BUILD_VERSION, ...)`，宠物中心一直有）、`toolbox/forest/index.html` 全 0 命中；`_includes/toolbox/pet/board.html` 全屏面板 DOM 与 `assets/js/pet.js` L5240 起的 `$tfsTabs` / `$tfsDaynav` / `$tfsPrev` / `$tfsDate` / `$tfsNext` / `$tfsToday` / `$tfsCustom` / `$tfsCustomStart` / `$tfsCustomEnd` 全部 id 一致 ✅、`setTrendPeriod` 双入口（内嵌 tab + 全屏 tab）绑定齐 ✅、`svgToPng` CSS 变量解析 + 2× 设备像素栅格化实现完整 ✅、`downloadTrendImage` 导出卡片含宠物头像 + 名字 + 物种年龄体重目标 + 区间日期 + 总量日均 + 站点署名 + 导出日期，无新增 debug 遗留。**今日 0 项自动修复**——11 个 commit 全部由站主亲手打磨（forest 主题氛围景观 10 连 + pet 趋势图下载 / 全屏横向看图 1 大 commit），属 UX / 视觉 / 交互层设计取向决策，一律不属本 agent 应擅动的"小而无争议"改动；build 健康、`_site/` 结构无异常、workspace 干净（`git status` clean、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、`find . -name "* 2.*"` 全空）、无任何低风险小修可做。**P1 队列**：唯一 P1 仍是承接 6-13 的 `_config.yml`.`study_order` 未列 `interm-econometrics`（今日**第 24 日承接**），`_notes/study/interm-econometrics/interm-econometrics-2023.md` 仍在，`comm -23 <(ls _notes/study/) <(sed -n '/^study_order:/,/^[a-z]/p' _config.yml | grep '^  - ')` 差集仍只此一条——纯 IA 设计判断，不擅动。**P2 队列**：承接 7-05 全部 P2（含 forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名共 25 条）——今日无新观察消除、承接不变。此外今日新出 **P2 新观察**：⑤ forest 主题氛围景观 10 连后再次**大幅拉开与真机 / PWA 验收清单的距离**（今日 +2385 行、其中 `730e659` 单条 +788 行体积云 / 大气景深 / 月晕星尘 / 雨的地面水花 / 水下焦散渲染），六组合真机验收清单本次要补：① 5 主题（月夜 / 日出 / 气泡 / 雨 / 晴）专业化渲染在 iPhone / Android / iPad / 桌面五端下的视觉一致性与性能（体积云 / 大气景深 / 月晕星尘 / 焦散 5 项高级渲染有无掉帧 / 电量占用）、② 主题按钮小景在 8 主题按钮 grid 里的辨识度、③ 高级树装饰（果实 / 灯串 / 小鸟 / 蝴蝶 / 落瓣）在 5 主题背景下的对比度、④ 樱花持续落樱在长时番茄 25/45/90min 下的性能长跑、⑤ 主题呼吸动效在 PWA standalone 下的丝滑度、⑥ 沉浸专注遮罩布局（计时移顶部、树种在前景地面带上、落雨水花可见）在竖屏 / 横屏 / 平板 / 桌面全屏四种下的层次感与是否遮挡关键 UI、⑦ 场景铺满整屏（e741f76 修的一刀切尺寸规则）在多分辨率下是否留边 / 或反向溢出、⑧ 极光 / 星空下架后 8 → 7 → 6 主题的用户可能吐槽（"我喜欢的主题不见了"）与迁移路径（老存档指向已下架主题时降级为 default），沙箱无 GUI / 无触屏跑不了；⑥ pet 趋势图下载 + 全屏横向看图是宠物中心继同步加固之后**第一个 UX 层新功能**（+284 / -12 行三文件联动），建议真机验收：(a) 6 种区间（今日 24h / 近 7 日 / 30 日 / 半年 / 1 年 / 自定义）分别导出图片卡片的清晰度与文字排布不错位、(b) 手机竖屏点「⤢ 横屏」进全屏时旋转 90° 的手感与横屏顶部 tab / 底部 daynav / 自定义起止日期在小屏上的可点击性、(c) 全屏内切区间 tab 与内嵌 tab 数据是否同步一致（共用 `setTrendPeriod`，理论上是）、(d) 导出卡片的宠物头像加载失败时的兜底（`loadImage` 返回 null 时是否降级为无头像卡片而非崩）、(e) 大数据量（近 1 年逐日）时 SVG 栅格化到 2× 设备像素的性能与生成图片尺寸是否过大、(f) 深色模式下卡片配色 token（`--color-bg` / `--color-bg-warm` / `--color-ink` / `--color-muted` / `--color-accent` / `--color-border`）解析是否正确，沙箱无浏览器跑不了。
>
> **仓库卫生**：目录结构与文件架构**较昨日无变化**——11 个 commit 全部锁在 4 个前端文件里，未新增 / 未删除任何目录、未新增 / 未删除任何 `_notes/` `_data/` `files/` 条目、未引入新二进制。工作树纯净（`git status` clean、`git ls-files --others --exclude-standard` 空、无编辑器 / 系统垃圾 / `* 2.*` 副本）。大文件核对与 7-05 / 7-04 完全一致：`files/or/or-2023.pdf` 5.3 MB 唯一 5 MB 以上、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB + `files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB 仍是 2 MB 以上二人组。`_paid/` + `_flight-staging/` 双双在 `_config.yml` L50/L52 exclude 列表内且 `_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空—— 双保险仍稳固。`_config.yml` 的 `exclude:` 列表已含 `DAILY_REVIEW.md`（L15）、`EMAIL_SUMMARY.md` 等所有内部产物。`assets/icons/forest-{apple-touch,icon-192,icon-512,icon-maskable-512}.png` 4 张图 mtime 仍是 6-30 首发日、size 未变（承接 7-05 观察 —— 本次 forest 10 连主题氛围重做未触发 PWA 主 icon 资源更新，若日后要为新的沉浸主题重画 icon 需另行安排）。**结论**：目录结构与文件架构与 7-05 完全一致，仅前端代码行内调整，无仓库卫生可动项。

### ✅ 本次已自动修复

无。

11 个 commit 全部由站主亲手打磨（forest 主题氛围景观 10 连 / pet 趋势图下载 + 全屏横向看图 1 大功能 commit）—— 均属 UX / 视觉 / 交互层设计取向决策，不属"小而无争议"范畴；build ✅ / `_site/` 26 项结构与 7-05 / 7-04 / 7-03 / 7-02 完全一致 / workspace 干净 / 无低风险小修可做。

### 📋 待你把关

#### P0（紧急）

无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 ~ 7-05，**第 24 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、120 页 Wooldridge 体系英文讲义、94 keywords 厚足覆盖）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 仍 26 个目录（较昨日不变）、`study_order` 仍 25 条，`comm -23` 差集仍只 `interm-econometrics` 一条。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）仍属设计判断，请你拍板 —— 承接 24 日，是仓库里最久的 P1。

#### P2（建议）

1. **`toolbox/forest/` 主题氛围景观 10 连之后待真机 / PWA 六组合验收再补 8 项**（**今日新观察 + 承接 7-05 P2#3**）—— 建议 iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + 「加装到主屏」PWA standalone 六组合下过完整流程一遍并补：① 5 主题专业渲染（体积云 / 大气景深 / 月晕星尘 / 雨的地面水花 / 水下焦散）在各端下的视觉一致性与性能、② 主题按钮小景在 7 主题按钮 grid 里的辨识度、③ 高级树装饰（果实 / 灯串 / 小鸟 / 蝴蝶 / 落瓣）在多主题背景下的对比度、④ 樱花持续落樱在长时番茄下的性能、⑤ 主题呼吸动效在 PWA standalone 下的丝滑度、⑥ 沉浸专注遮罩布局（计时移顶部、树种在前景地面带上、落雨水花可见）在四种尺寸下的层次感、⑦ 场景铺满整屏（e741f76）在多分辨率下是否留边或反向溢出、⑧ 极光 / 星空下架后老存档指向已下架主题的降级路径，并叠加 7-05 P2#3 的 10 项与 7-04 P2#3 的 13 项。沙箱无 GUI / 无触屏跑不了。

2. **`toolbox/pet` 趋势图下载 + 全屏横向看图待真机双端 6 项验收**（**今日新观察**）—— (a) 6 种区间（今日 24h / 近 7 日 / 30 日 / 半年 / 1 年 / 自定义）分别导出图片卡片的清晰度与文字排布不错位、(b) 手机竖屏点「⤢ 横屏」进全屏时旋转 90° 的手感与横屏顶部 tab / 底部 daynav / 自定义起止日期在小屏上的可点击性、(c) 全屏内切区间 tab 与内嵌 tab 数据是否同步一致（共用 `setTrendPeriod`，理论上是）、(d) 导出卡片的宠物头像加载失败时的兜底（`loadImage` 返回 null 时是否降级为无头像卡片而非崩）、(e) 大数据量（近 1 年逐日）时 SVG 栅格化到 2× 设备像素的性能与生成图片尺寸是否过大、(f) 深色模式下卡片配色 token 解析是否正确，沙箱无浏览器跑不了。

3. **`linear-algebra-strang.md` summary 里「本站中文《线性代数讲义》」的引用**（承接 6-24 ~ 7-05，性质与 7-05 一致）—— 站上线代中文材料以《经济学数学工具箱》里 ch1-ch7 存在，但书名不同、面向经济学博士。三种改法：① 保留字面等以后写独立中文《线性代数讲义》；② 改字面为「本站《经济学数学工具箱》线性代数部分（ch1-ch7）」并链过去；③ 删引用改自足介绍。**属内容写作 + 结构映射决策，请你拍板**。

4. **`_flight-staging/` 目录名与其内容实际角色不匹配**（承接 7-02 ~ 7-05，性质不变）—— 目录里的 `runner/` 已是**已上线机票监控工具的生产后端**，但目录名沿用「设计稿暂存」语义会误导。三种改法：① 保留名字（沉默约定）；② `runner/` 挪出到 `flightwatch/runner/` 需同步改 `flight/get:21` SRC 常量 + 新旧 URL 平滑迁移；③ `_flight-staging/` 改名 `_flightwatch/` 保 `_-`前缀防收录，只改 URL 前缀。**命名 / 迁移决策，请你拍板**。

5. **`assets/js/pet.js` 宠物中心 7-04 同步加固 2 连待真机双人 / 双端互测验收**（承接 7-04 ~ 7-05 P2#4，性质不变）—— 6 项互测清单（发件箱 opId 幂等 / 一台删除另一台不复活 / per-field meta 双管理员不互相覆盖 / propose 改时间 opId 幂等 / 云同步不冲掉共享宠物 / 成员 API 失败重试幂等），沙箱无双端真机跑不了。

6. **`toolbox/connect4` 从藏蓝改到奶油浅板后共享 palette 抽取方案需重新拟定**（承接 7-05 P2#5）—— 若日后要抽 `assets/css/main.css` 的 `--game-board-*` 共享 token，应以「奶油浅底 + 暖色棋子 + 藏蓝点缀」为新基准，本条待你重新拟定拍板方向。

7. **`toolbox/feixingqi` 骰子点色跟随玩家的「玩家色系统」是否抽出**（承接 7-05 P2#6）—— 是否要把「玩家色系统」抽成 `_data/players.yml` 或 CSS 变量供其他多人回合制工具（掼蛋 / 跳棋 / 五子棋 / 反棋）复用属设计决策，请你拍板。

8. **`toolbox/picker` 一周 6 commit 完整重构后待真机手感回归**（承接 7-04 ~ 7-05）—— 8 场景真机手感回归清单，沙箱无 GUI / 无触屏跑不了。

9. **chess + xiangqi「对坐模式」新加的 CSS 转 180° 待真机 iPad / iPhone 横屏面对面下一整局验收**（承接 7-03 ~ 7-05）—— 沙箱无触屏跑不了。

10. **`toolbox/pet` 宠物中心手机端食物列表「悬浮展开」新姿态待真机 iOS Safari + Android Chrome 双端验收**（承接 7-03 ~ 7-05）—— 沙箱无触屏跑不了。

11. **`scripts/audit/bare_dollar.py` 启发式漏判 `$\d+-...$` 类数学配对**（承接 6-30 ~ 7-05）—— 今日**未跑** audit 脚本，老待办承接。

12. **`scripts/audit/spotcheck.py` 的 `.tex 源` 探测启发式仍漏判带主题后缀和异目录情形**（承接 6-27 ~ 7-05）—— 今日**未跑** audit 脚本，老待办承接。

13. **`_notes/tutoring/` 10 篇里 7 篇缺 `summary` 字段**（承接 6-30 ~ 7-05）—— 老文盘扫，内容写作决策。

14. **`_notes/life/paid-test-us-visa-types.md` 缺 `summary` 字段且无法直接改**（承接 6-30 ~ 7-05）—— 需改源文件 `_paid/liuxue-test-visa.md` 或改 `scripts/paywall/build_paid.py`。

15. **`_notes/study/mao-thought/mao-thought-principles.md` 无 `summary:` 字段但正文 L17 是介绍段落**（承接 6-29 ~ 7-05）—— 写作偏好；PDF-only 页面有正文时 `post.html` 兜底不触发，渲染上不缺。

16. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接 6-03 ~ 7-05，功能正确、纯排版风格小差异，可忽略。

17. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接 6-03 ~ 7-05，内容写作决策。

18. **掼蛋 6-18 ~ 6-24 联机改造 + 6-30 四象限版型迁移待真机 / 微信内置浏览器跑两局完整联机回归**（承接 6-27 ~ 7-05）。沙箱无浏览器 / 无音频出口无法替代真机回归。

19. **宠物中心近期多轮更新待多浏览器 / 多设备验收**（承接 6-29 ~ 7-05）。沙箱无 GUI / 无真触屏，跑不了。

20. **机票监控 Phase 3 一键安装器 `flight/get` + Phase 2 后端 pipeline 待 mac 真机端到端跑一轮验收**（承接 7-02 ~ 7-05）。沙箱无 mac 出口跑不了。

21. **`toolbox/flight/` 5 个 HTML 页 UX 待多浏览器 / 多屏幕跑一遍**（承接 7-02 ~ 7-05）。

22. **《经济学博士的数学工具箱》教材首发三项确认**（承接 7-02 ~ 7-05）—— summary 长度 / `sub_category=经济学数学基础` 新分类走向 / `course=经济学数学工具箱` 是否挂进 `_data/course_aliases.yml`。

23. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 承接 6-18 ~ 7-05。

24. **5 条 DNS NameResolutionError 外链需站主在生产环境复验** —— 承接 6-08 ~ 7-05；今日**未跑** `dead_links.py`。

25. **`dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间字符串误判为外链** —— 承接 6-08 ~ 7-05，cosmetic 非阻塞。

26. **`toolbox/connect4` canvas 无键盘落子通道**（承接 7-03 ~ 7-05）—— 历史状态、非本次改动引入，可挪进"游戏 a11y 补齐"内容待办。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化。** `git diff --stat 50a650c..HEAD` 覆盖的 4 个文件全在 `toolbox/forest/index.html` + `_includes/toolbox/pet/board.html` + `assets/css/pet.css` + `assets/js/pet.js`——纯前端 / 组件 / 样式 / JS 改动，**未新增 / 未删除任何目录、未新增 / 未删除任何 `_notes/` `_data/` `files/` 条目**（`git diff --stat 50a650c..HEAD -- '*.md' '_data/*' '_config.yml' '_notes/**' 'files/**'` 空）。`git status` clean、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、`find . -name "* 2.*"` 全空，无编辑器 / 系统垃圾。大文件核对：仍与 7-05 / 7-04 一致——`files/or/or-2023.pdf` 5.3 MB 唯一 5 MB 以上、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB + `files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB 仍是 2 MB 以上二人组。`_paid/` + `_flight-staging/` 双双在 `_config.yml` L50/L52 exclude 列表内且 `_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空——双保险仍稳固。`toolbox/forest/` 目录仍 2 项（`index.html` 一天从 163.5 KB 长至约 200 KB / 5801 行 + `manifest.json` 758 B）、`assets/icons/forest-{apple-touch,icon-192,icon-512,icon-maskable-512}.png` 4 张 icon 仍 mtime 6-30 未变（本次 10 连主题氛围重做未触发 PWA 主 icon 资源更新——若日后要为新的沉浸主题重画 icon 需另行安排，承接 7-05 观察）。**结论**：目录结构与文件架构与 7-05 完全一致，仅前端代码行内调整，无仓库卫生可动项。

### 💓 后端脉搏 / 📬 读者来信

11 个 commit 均为前端 / 组件层打磨（forest 主题氛围景观 10 连纯前端 + pet 趋势图下载 / 全屏横向看图属客户端渲染 + Canvas 栅格化，无新增 API 调用），未新增任何对 zircon-urge / leaderboards / zircon-comments waline / 付费墙 `/api/paid` `/api/redeem` / pet-food fly.io 后端端点的依赖变化。`backend_pulse.py` 本次未主动跑（沙箱无 fly.io 出口，承接 6-04 ~ 7-05 每次巡检结论），站点后端配置维持稳定。

---

## 2026-07-05

> 例行无人值守巡检：build 健康度 + 仓库卫生。距 7-04 巡检共 **7 个 commit**（`cdac174` 之后 → `a17c509` 为止），**0 文章 / 0 IA / 0 `_data/` / 0 `_config.yml` / 0 `_notes/` / 0 `files/` 改动**（`git diff --stat cdac174..HEAD -- '*.md' '_data/*' '_config.yml' '_notes/**' 'files/**'` 空）——7 个 commit 全部锁在 3 个前端文件里：`toolbox/forest/index.html`（+602 / -429 行 / 5 commit）、`toolbox/connect4/index.html`（1 commit 换色）、`toolbox/feixingqi/index.html`（1 commit 骰子色）。三条主线：
>
> ① **`toolbox/forest/` 种树专注计时器视觉与玩法再迭代 5 连**（`fe9ce0b` → `ff042a5` → `e57a07c` → `193e414` → `a17c509`）——承接 7-04 首日 10 连产品化后的第二波打磨：(a) **主题色板辨识度 + 悬浮备注 + 树提示不出框 + 时长/自定义/严格开关改良**（fe9ce0b）—— 每种主题（森林 / 草原 / 湖畔 / 竹林 / 沙漠 / 雪原 / 樱花 / 秋叶）拉开辨识色差、田地上的树支持悬浮显示备注、树 popover 位置约束不再溢出容器、时长选择器与自定义分钟数交互对齐、严格度切换 UI 微调；(b) **重做生长树美术**（ff042a5）—— 五种树（松 / 枫 / 樱 / 竹 / 沙）的初芽 → 幼树 → 成树三阶段美术全部重画；(c) **落地所选方案——双叶苗 logo / 沉浸舞台 / 草坡田地 + 田地树同款重做**（e57a07c）—— logo 换成双叶苗 SVG、专注舞台改为沉浸背景、田地改草坡渐变、田地上的树用同款矢量重画；(d) **新玩法「合并 / 培养」——把小树整合成参天巨树**（193e414）—— 新增合并玩法，把多棵小树合成一棵参天巨树，是 forest 首个内容层玩法而非纯 UI 迭代；(e) **图标与树木美术 v3——图标重做 + 五树精修 + 高级树装饰阶梯**（a17c509）—— 应用图标（apple-touch / 192 / 512 / maskable）配套重做、五树精修 + 高级树多级装饰阶梯（花 / 果 / 星饰）。5 天内 forest 已从「首发 10 连产品化」→「玩法层扩展 5 连」，工具已具备 iOS / iPad / macOS / 安卓 / 桌面五端 PWA + 内容玩法 + 视觉主题体系的完整个人产品形态。 ② **`toolbox/connect4` 四子棋棋盘换成奶油浅色系贴合站点奶油底**（`c864aa2`）—— 承接 7-04 的藏蓝棋盘 → 奶油浅板（#f5efe3 → #e6dcc8）+ 凹洞改暖色「浅杯」（顶部暖阴影 + 底部受光）、AI 棋子暖金 → 琥珀金（#cf8a20）+ 在浅板上对比更足、获胜连线在浅板上白线不清 → 藏蓝发光线 + 藏蓝光环、hover 列高亮浅板用暖色压深、卡片投影藏蓝 → 暖棕（更浮）、深色模式给暖调不刺眼的深棕板对应、分享结算图同步；行为回归 DOM 模拟 11 项全绿，异步竞态既修 bug 未回退。是 7-04 视觉重做后又一次色板重定向——从「藏蓝深板厚重工业感」改为「奶油浅板贴合站点整体温润奶油底」。 ③ **`toolbox/feixingqi` 中央骰子点数改用当前玩家颜色兼作轮次提示**（`36ea411`）—— 轮到谁掷骰、骰面点数就用谁的座位色（红 / 黄 / 蓝 / 绿），配合原有的呼吸光环一起提醒当前是谁的回合；给点子加一圈极淡描边保证浅色的黄点在白骰面上依然清晰；掷骰翻滚动画与落定结果都跟随当前玩家色。是一次小而准的可用性微调，属"三秒钟看清是谁的回合"的直觉性设计。
>
> `bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（12.957 s cold build）。`_site/` 顶层仍 **26 项**（与 7-04 / 7-03 / 7-02 完全一致：`CNAME` `account` `admin` `admin-manifest.json` `assets` `assistant-fulltext.json` `assistant-index.json` `en` `essays` `feed.xml` `files` `flight` `google5306…` `index.html` `life` `manifest.json` `notes` `pdfjs` `redirects.json` `research` `robots.txt` `search.json` `sitemap.xml` `sw.js` `toolbox` `zh`），未新增 / 未删减顶级路径。`_site/toolbox/forest/index.html` 249.2 KB（源 163.5 KB + Jekyll layout 注入）、`_site/toolbox/connect4/index.html` 124.7 KB、`_site/toolbox/feixingqi/index.html` 213.2 KB 三处均渲染完整；`_site/toolbox/index.html` grep `/toolbox/forest/` 命中 2 次（生活工具组 tool-card + bulk-offline shortcut）；`_site/sitemap.xml` + `_site/search.json` forest / connect4 / feixingqi 各命中——搜索体系闭环。**未发现 `_flight-staging/` / `_paid/` 泄露**（`find _site -path "*_flight-staging*" -o -path "*_paid*"` 空）。**代码质量核对**：改动集中于 3 个前端文件，HTML 结构 parser 检查（`html.parser` 栈跟踪）forest / connect4 / feixingqi 三处 open tags 全部归零 ✅；`grep "console.log\|debugger\|TODO\|FIXME\|XXX"` 仅 feixingqi:L2932 一条邀请链接注释（`Opening a ?room=XXXX invite link ...`，XXXX 为占位符）、多处 `typeof x !== 'undefined'` 是合法 JS 存在性检查，均无新增 debug 遗留。**今日 0 项自动修复**——7 个 commit 全部由站主亲手打磨（forest 玩法 + 视觉 5 连深化 / connect4 换色 / feixingqi 骰色），属工具设计取向 / 交互决策 / 视觉品味范畴，一律不属本 agent 应擅动的"小而无争议"改动；build 健康、`_site/` 结构无异常、workspace 干净（`git status` clean、`git ls-files --others --exclude-standard` 空、无编辑器 / 系统垃圾 / `* 2.*` 副本）、无任何低风险小修可做。**P1 队列**：唯一 P1 仍是承接 6-13 的 `_config.yml`.`study_order` 未列 `interm-econometrics`（今日**第 23 日承接**），`_notes/study/interm-econometrics/interm-econometrics-2023.md` 仍在，`comm -23 <(ls _notes/study/) <(sed -n '/^study_order:/,/^[a-z]/p' _config.yml | grep '^  - ')` 差集仍只此一条——纯 IA 设计判断，不擅动。**P2 队列**：承接 7-04 全部 P2（含 forest / pet 真机验收、picker 一周 6 commit 手感回归、connect4 藏蓝配色抽 palette、chess / xiangqi 对坐模式验收、pet 手机端悬浮列表验收、bare_dollar / spotcheck 启发式漏判、tutoring 缺 summary、paid-test-visa 缺 summary、mao-thought-principles 无 summary、random hover 缩进、mid-2015/anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子共 20 余条）——今日无新观察消除、承接不变。此外今日新出 **P2 新观察**：⑤ forest 一天再迭代 5 连（主题色 / 生长树美术 / 沉浸舞台 / 合并培养玩法 / 图标与树 v3）后**再次拉开与 7-04 真机验收清单的距离**，建议 iPhone / Android / iPad / 桌面 Chrome / 桌面 Firefox / PWA standalone 六组合验收清单本次要补：8 种主题色板辨识度是否直觉、悬浮备注 popover 定位是否始终在容器内、树 popover 长时间悬浮的性能、五树三阶段美术在多主题背景下的对比度、logo 双叶苗 SVG 在多分辨率下清晰度、田地草坡渐变在浅 / 深模式的调性、**合并玩法**（多小树合成参天巨树）的操作发现性 / 撤销机制 / 是否会误伤番茄链累计、图标 v3 在主屏 icon 网格中的观感、高级树装饰阶梯（花 / 果 / 星饰）在稀有度上的辨识度，沙箱无 GUI / 无触屏跑不了；⑥ connect4 从藏蓝深板改到奶油浅板是站点视觉「与主底色更贴合」的选择——但 7-04 P2#6 提出「是否把 藏蓝 + 暖红 / 暖金 抽成 `--game-board-*` 共享 palette」的假设本次直接被推翻（本次 connect4 不再走藏蓝路线），若日后要抽 palette 应以「奶油浅底 + 暖色棋子 + 藏蓝点缀」为新基准，本条待重新拟定；⑦ feixingqi 骰子点数染当前玩家色是一次极小而准的可用性微调，与「呼吸光环 / 座位色」构成三层"是谁的回合"信号冗余，是否要把这套「玩家色系统」抽成 `_data/players.yml` 或 CSS 变量供其他多人回合制工具（掼蛋 / 跳棋 / 五子棋 / 反棋）复用可拍板——目前 feixingqi 是「红 / 黄 / 蓝 / 绿」座位色、掼蛋是「东南西北」四方位色、跳棋是六色，各自独立。

### ✅ 本次已自动修复

无。

7 个 commit 全部由站主亲手打磨（forest 视觉+玩法 5 连 / connect4 奶油浅板配色重定向 / feixingqi 骰子点色跟随当前玩家）——均属 UX / 视觉 / 玩法层设计取向决策，不属"小而无争议"范畴；build ✅ / `_site/` 26 项结构与 7-04 / 7-03 / 7-02 完全一致 / workspace 干净 / 无低风险小修可做。

### 📋 待你把关

#### P0（紧急）

无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 ~ 7-04，**第 23 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、120 页 Wooldridge 体系英文讲义、94 keywords 厚足覆盖）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 仍 26 个目录（较昨日不变）、`study_order` 仍 25 条，`comm -23` 差集仍只 `interm-econometrics` 一条。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）仍属设计判断，请你拍板 —— 承接 23 日，是仓库里最久的 P1。

#### P2（建议）

1. **`linear-algebra-strang.md` summary 里「本站中文《线性代数讲义》」的引用**（承接 6-24 ~ 7-04，性质与 7-04 一致）—— 站上线代中文材料以《经济学数学工具箱》里 ch1-ch7 存在，但书名不同、面向经济学博士。三种改法：① 保留字面等以后写独立中文《线性代数讲义》；② 改字面为「本站《经济学数学工具箱》线性代数部分（ch1-ch7）」并链过去；③ 删引用改自足介绍。**属内容写作 + 结构映射决策，请你拍板**。

2. **`_flight-staging/` 目录名与其内容实际角色不匹配**（承接 7-02 ~ 7-04，性质不变）—— 目录里的 `runner/` 已是**已上线机票监控工具的生产后端**，但目录名沿用「设计稿暂存」语义会误导。三种改法：① 保留名字（沉默约定）；② `runner/` 挪出到 `flightwatch/runner/` 需同步改 `flight/get:21` SRC 常量 + 新旧 URL 平滑迁移；③ `_flight-staging/` 改名 `_flightwatch/` 保 `_-`前缀防收录，只改 URL 前缀。**命名 / 迁移决策，请你拍板**。

3. **`toolbox/forest/` 种树专注计时器再迭代 5 连后待真机 / PWA 六组合验收再补 10 项**（**今日新观察 + 承接 7-04 P2#3**）—— 建议 iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + 「加装到主屏」PWA standalone 六组合下过完整流程一遍并补：① 8 种主题色板辨识度是否直觉、② 悬浮备注 popover 定位是否始终在容器内、③ 树 popover 长时间悬浮的性能、④ 五树三阶段美术在多主题背景下的对比度、⑤ logo 双叶苗 SVG 在多分辨率下清晰度、⑥ 田地草坡渐变在浅 / 深模式的调性、⑦ **合并玩法**（多小树合成参天巨树）的操作发现性 / 撤销机制 / 是否会误伤番茄链累计、⑧ 图标 v3 在主屏 icon 网格中的观感、⑨ 高级树装饰阶梯（花 / 果 / 星饰）在稀有度上的辨识度、⑩ PWA standalone 下装到主屏后是否具备完整独立体验，并叠加 7-04 P2#3 的 13 项手感与状态回归。沙箱无 GUI / 无触屏跑不了。

4. **`assets/js/pet.js` 宠物中心同步加固 2 连待真机双人 / 双端互测验收**（承接 7-04 P2#4，性质不变）—— 6 项互测清单（发件箱 opId 幂等 / 一台删除另一台不复活 / per-field meta 双管理员不互相覆盖 / propose 改时间 opId 幂等 / 云同步不冲掉共享宠物 / 成员 API 失败重试幂等），沙箱无双端真机跑不了。

5. **`toolbox/connect4` 从藏蓝改到奶油浅板后共享 palette 抽取方案需重新拟定**（**今日新观察**，替换 7-04 P2#6）—— 7-04 假设「站点主色 `--color-accent` 藏蓝、connect4 与其对齐、其他棋类（gomoku / chess / xiangqi / tiaoqi / reversi）也可复用」本次直接被推翻（connect4 改奶油浅板 + 藏蓝仅作获胜连线点缀）。若日后要抽 `assets/css/main.css` 的 `--game-board-*` 共享 token，应以「奶油浅底 + 暖色棋子 + 藏蓝点缀」为新基准，本条待你重新拟定拍板方向。

6. **`toolbox/feixingqi` 骰子点色跟随玩家的「玩家色系统」是否抽出**（**今日新观察**）—— feixingqi 骰点色 + 呼吸光环 + 座位色三层"是谁的回合"信号已冗余到位，是否要把「玩家色系统」抽成 `_data/players.yml` 或 CSS 变量供其他多人回合制工具（掼蛋 / 跳棋 / 五子棋 / 反棋）复用属设计决策，请你拍板——目前 feixingqi「红 / 黄 / 蓝 / 绿」、掼蛋「东南西北」、跳棋六色各自独立。

7. **`toolbox/picker` 一周 6 commit 完整重构后待真机手感回归**（承接 7-04 P2#5，性质不变）—— 8 场景真机手感回归清单，沙箱无 GUI / 无触屏跑不了。

8. **chess + xiangqi「对坐模式」新加的 CSS 转 180° 待真机 iPad / iPhone 横屏面对面下一整局验收**（承接 7-03 ~ 7-04）—— 沙箱无触屏跑不了。

9. **`toolbox/pet` 宠物中心手机端食物列表「悬浮展开」新姿态待真机 iOS Safari + Android Chrome 双端验收**（承接 7-03 ~ 7-04）—— 沙箱无触屏跑不了。

10. **`scripts/audit/bare_dollar.py` 启发式漏判 `$\d+-...$` 类数学配对**（承接 6-30 ~ 7-04）—— 今日**未跑** audit 脚本，老待办承接。

11. **`scripts/audit/spotcheck.py` 的 `.tex 源` 探测启发式仍漏判带主题后缀和异目录情形**（承接 6-27 ~ 7-04）—— 今日**未跑** audit 脚本，老待办承接。

12. **`_notes/tutoring/` 10 篇里 7 篇缺 `summary` 字段**（承接 6-30 ~ 7-04）—— 老文盘扫，内容写作决策。

13. **`_notes/life/paid-test-us-visa-types.md` 缺 `summary` 字段且无法直接改**（承接 6-30 ~ 7-04）—— 需改源文件 `_paid/liuxue-test-visa.md` 或改 `scripts/paywall/build_paid.py`。

14. **`_notes/study/mao-thought/mao-thought-principles.md` 无 `summary:` 字段但正文 L17 是介绍段落**（承接 6-29 ~ 7-04）—— 写作偏好；PDF-only 页面有正文时 `post.html` 兜底不触发，渲染上不缺。

15. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接 6-03 ~ 7-04，功能正确、纯排版风格小差异，可忽略。

16. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接 6-03 ~ 7-04，内容写作决策。

17. **掼蛋 6-18 ~ 6-24 联机改造 + 6-30 四象限版型迁移待真机 / 微信内置浏览器跑两局完整联机回归**（承接 6-27 ~ 7-04）。沙箱无浏览器 / 无音频出口无法替代真机回归。

18. **宠物中心近期多轮更新待多浏览器 / 多设备验收**（承接 6-29 ~ 7-04）。沙箱无 GUI / 无真触屏，跑不了。

19. **机票监控 Phase 3 一键安装器 `flight/get` + Phase 2 后端 pipeline 待 mac 真机端到端跑一轮验收**（承接 7-02 ~ 7-04）。沙箱无 mac 出口跑不了。

20. **`toolbox/flight/` 5 个 HTML 页 UX 待多浏览器 / 多屏幕跑一遍**（承接 7-02 ~ 7-04）。

21. **《经济学博士的数学工具箱》教材首发三项确认**（承接 7-02 ~ 7-04）—— summary 长度 / `sub_category=经济学数学基础` 新分类走向 / `course=经济学数学工具箱` 是否挂进 `_data/course_aliases.yml`。

22. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 承接 6-18 ~ 7-04。

23. **5 条 DNS NameResolutionError 外链需站主在生产环境复验** —— 承接 6-08 ~ 7-04；今日**未跑** `dead_links.py`。

24. **`dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间字符串误判为外链** —— 承接 6-08 ~ 7-04，cosmetic 非阻塞。

25. **`toolbox/connect4` canvas 无键盘落子通道**（承接 7-03 ~ 7-04）—— 历史状态、非本次配色改动引入，可挪进"游戏 a11y 补齐"内容待办。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化。** `git diff --stat cdac174..HEAD` 覆盖的 3 个文件全在 `toolbox/{forest,connect4,feixingqi}/index.html`——纯前端代码改动，**未新增 / 未删除任何目录、未新增 / 未删除任何 `_notes/` `_data/` `files/` 条目**（`git diff --stat cdac174..HEAD -- '*.md' '_data/*' '_config.yml' '_notes/**' 'files/**'` 空）。`git status` clean、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、`find . -name "* 2.*"` 全空，无编辑器 / 系统垃圾。大文件核对：仍与 7-04 一致——`files/or/or-2023.pdf` 5.55 MB 唯一 5 MB 以上（承接 `images.py` 潜在 pdfslim 候选）、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB + `files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB 仍是 2 MB 以上二人组。`_paid/` + `_flight-staging/` 双双在 `_config.yml` L50/L52 exclude 列表内且 `_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空——双保险仍稳固。`toolbox/forest/` 目录仍 2 项（`index.html` 163.5 KB / 5 天从 143.8 KB 增长 20 KB 反映玩法 + 视觉扩展 + `manifest.json` 758 B）、`assets/icons/forest-{apple-touch,icon-192,icon-512,icon-maskable-512}.png` 4 张图 7-01 首发时已到位（**注**：a17c509 commit message 提到「图标重做」但**这 4 个 PNG 文件的 mtime 仍是 6-30 首发日、size 未变**——可能是 commit message 说的「图标」指 SVG logo / 应用内图标而非站点 PWA 主 icon，请你留意本条以确认没有需要更新的 PWA icon 资源被漏 push）、`_data/toolbox.yml` L…「工作」分类 forest entry 已挂 status=live、`_site/toolbox/index.html` 生活工具组 tool-card + bulk-offline shortcut 已渲染到位（`grep -c "/toolbox/forest/"` 命中 2 次），forest 已完成从「新工具首发」到「玩法层扩展」的连续 5 天完整落地。**结论**：目录结构与文件架构与 7-04 完全一致，仅前端代码行内调整，无仓库卫生可动项。

### 💓 后端脉搏 / 📬 读者来信

7 个 commit 均为前端工具代码打磨（forest 视觉 + 玩法 5 连 / connect4 换色 / feixingqi 骰色），未新增任何对 zircon-urge / leaderboards / zircon-comments waline / 付费墙 `/api/paid` `/api/redeem` / pet-food fly.io 后端端点的依赖变化。`backend_pulse.py` 本次未主动跑（沙箱无 fly.io 出口，承接 6-04 ~ 7-04 每次巡检结论），站点后端配置维持稳定。

---

## 2026-07-04

> 例行无人值守巡检：build 健康度 + 仓库卫生。距 7-03 巡检共 **17 个 commit**（`bc37516` 之后 → `901bb56` 为止），**0 文章 / 0 IA / 0 `_data/` / 0 `_config.yml` / 0 `_notes/` / 0 `files/` 改动**（`git diff --stat bc37516..HEAD -- '*.md' '_data/*' '_config.yml' '_notes/**' 'files/**'` 空）——17 个 commit 全部锁在 5 个前端文件里：`toolbox/forest/index.html`（+1109 行主体重构 / 10 commit）、`toolbox/picker/index.html` + `assets/js/games/picker.js`（3 commit 收口）、`assets/js/pet.js`（2 commit 同步加固）、`toolbox/connect4/index.html`（2 commit 文案 + 配色贴合），共 +1433 / -731 行。四条主线：

> ① **`toolbox/forest/` 种树专注计时器 10 连深度打磨**（`d957fe8` → `c626858` → `d423595` → `0c55e54` → `eb172ee` → `34cd926` → `54db4ec` → `9397a8e` → `172d299` → `25c772c`）——这是 7-01 `bcfa289` 首发的新工具（`_data/toolbox.yml` 已挂 `工作` 分类 status=live、独立 PWA `toolbox/forest/manifest.json` + 3 尺寸 icon `assets/icons/forest-icon-{192,512,maskable-512}.png` + `forest-apple-touch-icon.png`），本次一天 10 commit 从「视觉地基」（设计 token `--ft-r-*` / `--ft-fs-*` / `--ft-danger*` / `--ft-gold*` / `--ft-shadow-card` 全套内联 + 去装饰 emoji + 图标线性化）→「文案精简中性化」（三步法 delete/redesign/keep）→「站内 modal/toast 替代原生弹窗 + 枯树可铲除+撤销 + 首屏规则常驻」→「智能续跑 + 完整暂停 + 持久化番茄链 / 灌溉态」（修 P0 秒杀树）→「三端响应式 + PWA 手感」（平板适配 / 触摸目标 / 防橡皮筋）→「架构健壮性」（多 tab 同步 / 位置分配不覆盖 / popover 滚动即关）→「对抗式审查发现的 3 真实 bug 修复」→「零棵树时隐藏经验图表面板」（新用户首屏不再一片空）→「P3 收尾 3 项」（桌面两栏 / 专注遮罩节奏 / 多田用途提示）→「专注严格度可切换」（桌面默认宽松 / 手机默认严格，`visibilitychange` 宽松模式不判枯萎），从首发一天完成从视觉→交互→架构→响应式→无障碍→严格度模型 6 层完整产品化打磨。 ② **`toolbox/picker` 抽签器 3 连收口**（`9b1cbb3` → `90dc8da` → `e4e2104`）—— 默认「是 / 否」两选项 + 8 字红框校验 + 转盘文字正立沿半径 + 等权显示对齐 + 历史分页板块 + 档案板块（删导入导出 / 关于）→ 8 字红字提示真正显示 + 手机端不再用 CSS 压固定字号导致转盘字重叠 → 清掉重构后遗留的死 CSS（`.profile-bar` / `.profile-select` / `.profile-action*` / `.io-*` / `details.about` / `.history-actions` / `.history-clear`），完成 7-01 ~ 7-03 picker 三连迭代（占比联动+锁定 → 动态量程 → 绝对语义）之后的 UX / 视觉 / 死代码收口。 ③ **`assets/js/pet.js` 宠物中心同步加固 2 连**（`7b02c3a` → `901bb56`）—— 客户端同步加固（配合已上线的后端原子 CAS）：发件箱每条 op 带 opId 后端幂等、add-entry 后核实服务器确实收到才划掉、失败只在明确终态拒绝才丢弃 / 其余瞬时错留队重试（不再静默丢记录）、api() 不再把「200 但响应体无法解析」当成功、合并改为墓碑感知（服务器权威 + 去 tombstone id + 本地独有未删记录保留）、自愈拉取时若本地某条记录服务器缺失且未被删也不在发件箱则重新入队补推、云同步不再覆盖共享宠物的记录 / 元数据 / 成员 / 发件箱 / 令牌、meta 推送计时器改 per-pet、saveFoodRemain 走 commitNewEntry（配额满回滚+提示）；随后收尾两处较低危：per-field meta 细粒度（`pet._syncedMeta` 记录每个字段的「上次服务器值」，只推与之不同的字段——两个管理员在防抖窗内改不同 meta 字段不再互相覆盖）+ 成员 / 改时间操作可靠重试（`apiRetry()` member 与 propose / decide-time-change 遇瞬时失败自动重试几次、propose-time-change 带稳定 opId 重试不产生重复 tc）。 ④ **`toolbox/connect4` 四子棋文案 + 配色 2 连**（`884a1d0` → `ccf95e7`）—— 帮助文案去掉不存在的「顶部箭头」改为「点击某一列落子」+ 棋盘配色改藏蓝 + 暖红 / 暖金贴合站点风格 + 板身铺满整框去掉顶部空白条，承接 7-02 视觉重做 + 4 bug 修复之后的收尾。

> `bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（11.972 s cold build）。`_site/` 顶层仍 **26 项**（与 7-03 / 7-02 完全一致：`CNAME` `account` `admin` `admin-manifest.json` `assets` `assistant-fulltext.json` `assistant-index.json` `en` `essays` `feed.xml` `files` `flight` `google5306…` `index.html` `life` `manifest.json` `notes` `pdfjs` `redirects.json` `research` `robots.txt` `search.json` `sitemap.xml` `sw.js` `toolbox` `zh`），未新增 / 未删减顶级路径。`_site/toolbox/forest/index.html` 229.5 KB 渲染完整（源 143.8 KB + Jekyll layout 注入）；`_site/toolbox/index.html` grep `/toolbox/forest/` 命中 2 次（生活工具组 tool-card + bulk-offline shortcut）；`_site/sitemap.xml` + `_site/search.json` 各命中 forest 1 次（sitemap 走 URL、search 走 note-card 索引）——搜索体系闭环。**未发现 `_flight-staging/` / `_paid/` 泄露**（`find _site -path "*_flight-staging*" -o -path "*_paid*"` 空）。**代码质量核对**：改动集中于 5 个前端文件，`grep "console.log\|debugger\|TODO\|FIXME\|XXX"` 仅 `assets/js/pet.js:5` 一条有意的品牌 log（`console.log('%c🐾 宠物中心 ' + BUILD_VERSION, ...)`，宠物中心一直有），forest / picker / connect4 三个页面全 0 命中，无新增 debug 遗留。**今日 0 项自动修复**——17 个 commit 全部由站主亲手打磨（forest 首日爆发式产品化 10 连 + picker 收口 3 连 + pet 同步加固 2 连 + connect4 文案 / 配色 2 连），属工具设计取向 / 交互决策 / 视觉品味 / 架构健壮性范畴，一律不属本 agent 应擅动的"小而无争议"改动；build 健康、`_site/` 结构无异常、workspace 干净（`git status` clean、`git ls-files --others --exclude-standard` 空）、无任何低风险小修可做。**P1 队列**：唯一 P1 仍是承接 20 日的 `_config.yml`.`study_order` 未列 `interm-econometrics`（今日**第 22 日承接**），`_notes/study/interm-econometrics/interm-econometrics-2023.md` 仍在，`comm -23 <(ls _notes/study/) <(sed -n '/^study_order:/,/^[a-z]/p' _config.yml | grep '^  - ')` 差集仍只此一条——纯 IA 设计判断，不擅动。**P2 队列**：承接 7-03 全部 P2（21 条），今日无新观察消除、承接不变。此外今日新出 **P2 新观察**：⑤ forest 一天 10 commit 从视觉→交互→架构→响应式→无障碍→严格度模型全流程收口，代表新工具的产品化速度已完成第一波但**尚未真机 / PWA 验收**，建议 iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + 「加装到主屏」PWA standalone 六组合下过完整流程一遍（首次种树 / 番茄链续跑 / 智能续跑 / 完整暂停 / 灌溉态持久化 / 枯树铲除+撤销 / 多田用途 / 桌面两栏 / 移动端严格模式离开枯萎 / 桌面宽松模式离开不惩罚 / popover 滚动即关 / 多 tab 同步 / 位置分配不覆盖），沙箱无 GUI 跑不了；⑥ pet 客户端同步加固两连是配合后端原子 CAS 一同保证「记录零丢失 / 删除不复活 / 成员间最终一致」的重要架构性改动，建议真机双人（两设备 / 两浏览器）互测：连出多条记录后其中一台断网 → 回连不丢；一台删除记录 → 另一台不复活；两个管理员同时改不同 meta 字段 → 都保留；两人同时 propose 改时间 → opId 幂等不产生重复 tc；账号云同步触发时 → 共享宠物记录不被冲掉；成员 API 失败重试期间不产生重复效果，沙箱无双端真机跑不了；⑦ picker 8 字校验 + 转盘正立 + 等权对齐 + 历史分页 + 档案板块 + 死 CSS 清理三连收口后，与 7-01 ~ 7-03 的权重语义三连迭代合并成**picker 一周内 6 commit 完整重构**，建议站主一次真机手感回归；⑧ connect4 配色改藏蓝+暖红/暖金贴合站点风格，与全站 `--color-accent` 藏蓝色 palette 一致，是否要把这套配色 token 抽到 `assets/css/main.css` 供其他棋类复用（gomoku / chess / xiangqi / tiaoqi / reversi 目前各有一套配色）待你拍板；⑨ 承接 7-03 P2#4「connect4 canvas 无键盘落子通道」——本次视觉再迭代但未补 a11y 键盘通道，仍列在"游戏 a11y 补齐"内容待办。

### ✅ 本次已自动修复

无。

17 个 commit 全部由站主亲手打磨（forest 一天完成 10 层深度产品化 / picker 收口 3 连 / pet 同步加固 2 连 / connect4 文案配色 2 连）——均属 UX / 视觉 / 架构 / 交互设计取向决策，不属"小而无争议"范畴；build ✅ / `_site/` 26 项结构与 7-03 / 7-02 完全一致 / workspace 干净 / 无低风险小修可做。

### 📋 待你把关

#### P0（紧急）

无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 ~ 7-03，**第 22 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、120 页 Wooldridge 体系英文讲义、94 keywords 厚足覆盖）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 仍 26 个目录（较昨日不变）、`study_order` 仍 25 条，`comm -23` 差集仍只 `interm-econometrics` 一条。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）仍属设计判断，请你拍板 —— 承接 22 日，是仓库里最久的 P1。

#### P2（建议）

1. **`linear-algebra-strang.md` summary 里「本站中文《线性代数讲义》」的引用**（承接 6-24 ~ 7-03，性质与 7-03 一致）—— 站上线代中文材料以《经济学数学工具箱》里 ch1-ch7 存在，但书名不同、面向经济学博士。三种改法：① 保留字面等以后写独立中文《线性代数讲义》；② 改字面为「本站《经济学数学工具箱》线性代数部分（ch1-ch7）」并链过去；③ 删引用改自足介绍。**属内容写作 + 结构映射决策，请你拍板**。

2. **`_flight-staging/` 目录名与其内容实际角色不匹配**（承接 7-02 ~ 7-03，性质不变）—— 目录里的 `runner/` 已是**已上线机票监控工具的生产后端**，但目录名沿用「设计稿暂存」语义会误导。三种改法：① 保留名字（沉默约定）；② `runner/` 挪出到 `flightwatch/runner/` 需同步改 `flight/get:21` SRC 常量 + 新旧 URL 平滑迁移；③ `_flight-staging/` 改名 `_flightwatch/` 保 `_-`前缀防收录，只改 URL 前缀。**命名 / 迁移决策，请你拍板**。

3. **`toolbox/forest/` 种树专注计时器 10 连深度打磨后待真机 / PWA 六组合验收**（**今日新观察**）—— 建议 iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + 「加装到主屏」PWA standalone 六组合下过完整流程一遍（首次种树 / 番茄链续跑 / 智能续跑 / 完整暂停 / 灌溉态持久化 / 枯树铲除+撤销 / 多田用途提示 / 桌面两栏 / 移动端严格模式离开枯萎 / 桌面宽松模式离开不惩罚 / popover 滚动即关 / 多 tab 同步 / 位置分配不覆盖 13 项手感与状态回归），特别看：① 智能续跑 + 完整暂停 + 持久化番茄链 / 灌溉态在 tab 切换 / 息屏 / 后台 / 手动锁屏后回来的状态恢复是否可靠、②「离开页面：树会枯萎 / 不影响」严格度切换在桌面（默认宽松）与手机（默认严格）分别是否直觉、③ 全屏专注遮罩的 grace 药丸与番茄计数药丸垂直节奏是否统一、④ 只有 1 块田时「按项目 / 时期分开管理」轻提示与多田后自动消失、⑤ PWA standalone 下装到主屏后是否具备完整独立体验（`start_url` + `scope` + `display=standalone` + `theme_color=#fafaf9` + 独立 apple-touch-icon + 3 尺寸 icon 全套已在 `manifest.json` 定义）。沙箱无 GUI / 无触屏跑不了。

4. **`assets/js/pet.js` 宠物中心同步加固 2 连待真机双人 / 双端互测验收**（**今日新观察**）—— 建议两设备 / 两浏览器互测：① 连出多条记录后其中一台断网 → 回连不丢（发件箱 opId 幂等重试）；② 一台删除记录 → 另一台不复活（合并墓碑感知）；③ 两个管理员同时改不同 meta 字段 → 都保留（per-field `_syncedMeta` 只推 diff）；④ 两人同时 propose 改时间 → opId 幂等不产生重复 tc（`apiRetry()` + 稳定 opId）；⑤ 账号云同步触发时 → 共享宠物记录 / 元数据 / 成员 / 发件箱 / 令牌不被冲掉（云同步跳过共享宠物字段）；⑥ 成员 API 失败重试期间不产生重复效果（`apiRetry()` 兜底幂等）。沙箱无双端真机跑不了。

5. **`toolbox/picker` 一周 6 commit 完整重构后待真机手感回归**（**今日新观察**，与 7-03 P2#3 合并）—— 建议 iPhone Safari + 桌面 Chrome 各拉一次 3~10 选项 / 锁 1~2 项 / 4 项等权对齐 / 长名 8 字（8 字红框校验触发） / 空选项禁抽 / 转盘 1% 细扇区 / 历史分页板块 / 档案板块八种场景手感回归，特别看：绝对语义占比拖动的直觉度、转盘文字沿半径正立在 1~8 字下字号是否稳定、8 字红字提示是否显示、手机端转盘字不再重叠、死 CSS 清理后无视觉回归。沙箱无 GUI / 无触屏跑不了。

6. **`toolbox/connect4` 配色改藏蓝 + 暖红 / 暖金贴合站点风格是否要抽成共享 palette**（**今日新观察**）—— 站点主色 `--color-accent` 藏蓝，本次 connect4 与其对齐；其他棋类（gomoku / chess / xiangqi / tiaoqi / reversi）目前各有一套私有配色，是否要在 `assets/css/main.css` 抽出 `--game-{board,piece-warm-red,piece-warm-gold,line}` 一套共享 token 供后续复用属设计取向决策，请你拍板。

7. **chess + xiangqi「对坐模式」新加的 CSS 转 180° 待真机 iPad / iPhone 横屏面对面下一整局验收**（承接 7-03）—— 沙箱无触屏跑不了。

8. **`toolbox/pet` 宠物中心手机端食物列表**「悬浮展开」**新姿态待真机 iOS Safari + Android Chrome 双端验收**（承接 7-03）—— 沙箱无触屏跑不了。

9. **`scripts/audit/bare_dollar.py` 启发式漏判 `$\d+-...$` 类数学配对**（承接 6-30 ~ 7-03）—— 今日**未跑** audit 脚本，老待办承接。

10. **`scripts/audit/spotcheck.py` 的 `.tex 源` 探测启发式仍漏判带主题后缀和异目录情形**（承接 6-27 ~ 7-03）—— 今日**未跑** audit 脚本，老待办承接。

11. **`_notes/tutoring/` 10 篇里 7 篇缺 `summary` 字段**（承接 6-30 ~ 7-03）—— 老文盘扫，内容写作决策。

12. **`_notes/life/paid-test-us-visa-types.md` 缺 `summary` 字段且无法直接改**（承接 6-30 ~ 7-03）—— 需改源文件 `_paid/liuxue-test-visa.md` 或改 `scripts/paywall/build_paid.py`。

13. **`_notes/study/mao-thought/mao-thought-principles.md` 无 `summary:` 字段但正文 L17 是介绍段落**（承接 6-29 ~ 7-03）—— 写作偏好；PDF-only 页面有正文时 `post.html` 兜底不触发，渲染上不缺。

14. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接 6-03 ~ 7-03，功能正确、纯排版风格小差异，可忽略。

15. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接 6-03 ~ 7-03，内容写作决策。

16. **掼蛋 6-18 ~ 6-24 联机改造 + 6-30 四象限版型迁移待真机 / 微信内置浏览器跑两局完整联机回归**（承接 6-27 ~ 7-03）。沙箱无浏览器 / 无音频出口无法替代真机回归。

17. **宠物中心近期多轮更新待多浏览器 / 多设备验收**（承接 6-29 ~ 7-03；本轮再加同步加固两连；建议 iPhone Safari + Android Chrome + 桌面 Chrome + 桌面 Firefox + PWA standalone 至少五组合下过一遍）。沙箱无 GUI / 无真触屏，跑不了。

18. **机票监控 Phase 3 一键安装器 `flight/get` + Phase 2 后端 pipeline 待 mac 真机端到端跑一轮验收**（承接 7-02 ~ 7-03）。沙箱无 mac 出口跑不了。

19. **`toolbox/flight/` 5 个 HTML 页 UX 待多浏览器 / 多屏幕跑一遍**（承接 7-02 ~ 7-03）。

20. **《经济学博士的数学工具箱》教材首发三项确认**（承接 7-02 ~ 7-03）—— summary 长度 / `sub_category=经济学数学基础` 新分类走向 / `course=经济学数学工具箱` 是否挂进 `_data/course_aliases.yml`。

21. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 承接 6-18 ~ 7-03。

22. **5 条 DNS NameResolutionError 外链需站主在生产环境复验** —— 承接 6-08 ~ 7-03；今日**未跑** `dead_links.py`。

23. **`dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间字符串误判为外链** —— 承接 6-08 ~ 7-03，cosmetic 非阻塞。

24. **`toolbox/connect4` canvas 无键盘落子通道**（承接 7-03）—— 历史状态、非本次视觉再迭代引入，可挪进"游戏 a11y 补齐"内容待办。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化。** `git diff --stat bc37516..HEAD` 覆盖的 5 个文件全在 `toolbox/{forest,picker,connect4}/index.html` + `assets/{js/games/picker.js,js/pet.js}`——纯前端代码改动，**未新增 / 未删除任何目录、未新增 / 未删除任何 `_notes/` `_data/` `files/` 条目**（`git diff --stat bc37516..HEAD -- '*.md' '_data/*' '_config.yml' '_notes/**' 'files/**'` 空）。`git status` clean、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、`find . -name "* 2.*"` 全空，无编辑器 / 系统垃圾。大文件核对：仍与 7-03 一致——`files/or/or-2023.pdf` 5.55 MB 唯一 5 MB 以上（`images.py` 潜在 pdfslim 候选、承接昨日）、`files/econ-math-toolkit/econ-math-toolkit.pdf` 3.02 MB + `files/interm-macro/interm-macro-2022-zh.pdf` 2.23 MB 仍是 2 MB 以上二人组、均低于 5 MB 阈值。`_paid/` + `_flight-staging/` 双双在 `_config.yml` L50/L52 exclude 列表内且 `_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空——双保险仍稳固。`toolbox/forest/` 目录只 2 项（`index.html` 143.8 KB + `manifest.json` 758 B）、`assets/icons/forest-icon-{192,512,maskable-512,apple-touch-icon}.png` 4 张图 7-01 首发时已到位、`_data/toolbox.yml` L…「工作」分类 forest entry 已挂 status=live、`_site/toolbox/index.html` 生活工具组 tool-card + bulk-offline shortcut 已渲染到位（`grep -c "/toolbox/forest/"` 命中 2 次），forest 已完成从「新工具首发」到「产品级打磨」的完整落地闭环。**结论**：目录结构与文件架构与 7-03 完全一致，仅前端代码行内调整，无仓库卫生可动项。

### 💓 后端脉搏 / 📬 读者来信

17 个 commit 均为前端工具代码打磨（forest 种树深度产品化 10 连 / picker 收口 3 连 / pet 同步加固 2 连 / connect4 文案配色 2 连），pet 客户端同步加固 2 连是**配合已上线的后端原子 CAS 的客户端侧补齐**（发件箱 opId 幂等 / 墓碑感知合并 / 云同步不覆盖 / per-field meta / 成员操作 apiRetry），逻辑上仍走 pet-food fly.io 后端；未**新增**任何对 zircon-urge / leaderboards / zircon-comments waline / 付费墙 `/api/paid` `/api/redeem` 端点的依赖。`backend_pulse.py` 本次未主动跑（沙箱无 fly.io 出口，承接 6-04 ~ 7-03 每次巡检结论），站点后端配置维持稳定。

---

## 2026-07-03

> 例行无人值守巡检：build 健康度 + 仓库卫生。距 7-02 巡检共 **7 个 commit**（`965babf` 之后 → `f65264a` 为止），全部是**前端小工具的 UX/视觉打磨**，一行内容 / IA / `_data/` / `_config.yml` / `_notes/` / `files/` 都未动（`git diff --stat 965babf..HEAD -- '*.md' '_data/*' '_config.yml'` 空）。三条主线：① **`toolbox/picker` 抽签工具三连迭代**（`75b6f3e` → `9c4d134` → `f65264a`）—— 权重模型从"直编占比 + 联动补足 + 可锁定 + 长名图例 + 空选项禁抽 + 转盘居中→首抽滑左 + 平均分配按钮"→ 滑块量程改动态"可占区间"（锁定 50% 后拖第二条按剩余池分）+ 转盘文字改沿辐条排布 → 再回归**绝对语义**（相同占比→相同位置，四项 25% 时四滑块对齐；上限时该行回填真实值），配合选项名 8 字上限、转盘字号只看扇区大小与字符实际宽度（1~8 字同样大小、cap8 逻辑），resvg 无头验证。② **`toolbox/chess + xiangqi` 象棋 / 中象共 3 项修复 + 1 新模式**（`8d032f0`）—— (a) `pointerdown` 重入清理 + `move/up/cancel` 挂 window + `try/finally` + 兜底扫除孤儿幽灵，根除多指触屏拖拽后卡死在视口的幽灵棋子；(b) 回合超时托管改「始终给完整倒计时、再次超时才代走一手 + 任何手动落子即解除托管」，修复连超两轮后人被永久夺权；(c) 新增「对坐模式」（触屏默认开 + 桌面手动开关），本机双人时把对面棋子转 180°，与「每回合翻转」互斥；(d) 手机端(≤600px)缩小楚河汉界 / 中央倒计时药丸不再盖住中路棋子。③ **`toolbox/connect4` 四子棋棋盘视觉重做 + 4 个 bug 修复**（`6172d78`）—— 满宽正方棋盘 + 竖向渐变蓝板 + 底部暗边模拟板厚 + 凹陷洞（顶部内阴影 + 底部受光）+ 红/黄玻璃糖果质感 + 悬停幽灵子 + 获胜四连改「发光连线 + 逐子光环」+ DPR 视网膜清晰渲染 + 深色模式棋盘配色 + 分享结算图同步 + 静态棋盘层离屏缓存；bug 修复（多 agent 对抗式评审 + DOM 模拟回归确认）：P2 换局/换难度时在途 AI 思考链未取消 → 新盘幽灵落子（加 gen 代号 + 可取消定时器）、P2 aiMove 缺 aiThinking 守卫 → 暂停秒续可能重复落子（加守卫 + 落子前重校验列）、P3 下落动画改用「行」为单位（resize 不再让棋子瞬移）、P3 C4_DIFF_LABEL "简单/困难" → "新手/高手"与全站 UI 统一。④ **`toolbox/pet` 宠物中心手机端 UX 两连**（`74c2537` + `261b0cb`）—— 手机端选食物先改「展开式全宽列表·选完自动收起」（方案 B：顶部触发条 `#food-picker-trigger`、点它整宽铺开、组头独立展开、`selectRecordFood` 收回），随后改进为**悬浮展开**（绝对定位在触发条正下方、盖住下面填写区、不再把页面撑长/推下去；触发条定高 48px + 列表 max-height 46vh/360px、可滚、带阴影实底；`▾ ↔ ▴` 切换；点列表 / 触发条以外自动收起；桌面端完全不变）。改动 8 个文件共 +662 / -284 行——`assets/js/games/picker.js` (+291/-...) / `toolbox/picker/index.html` / `toolbox/connect4/index.html` / `toolbox/chess/index.html` / `toolbox/xiangqi/index.html` / `_includes/toolbox/pet/board.html` / `assets/css/pet.css` / `assets/js/pet.js`（净新增 29 行）。
>
> `bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（15.29 s cold build）。`_site/` 顶层仍 26 项（与 7-02 完全一致：`account` `admin` `admin-manifest.json` `assets` `assistant-fulltext.json` `assistant-index.json` `CNAME` `en` `essays` `feed.xml` `files` `flight` `google5306…` `index.html` `life` `manifest.json` `notes` `pdfjs` `redirects.json` `research` `robots.txt` `search.json` `sitemap.xml` `sw.js` `toolbox` `zh`），未新增 / 未删减顶级路径；`_site/toolbox/{picker,connect4,chess,xiangqi}/index.html` 全部渲染，`_site/toolbox/chess/ai-worker.js` 仍在（原引用未受本次改动波及）。**未发现 `_flight-staging/` / `_paid/` 泄露**（`_site/life/paid-test/` 内 2 个 HTML 属付费预览，已上线，不是泄露）。**代码质量核对**：改动集中于 5 个游戏/工具文件，`grep "console.log\|debugger\|TODO\|FIXME\|XXX"` 仅命中 `assets/js/pet.js:5` 那条有意的品牌 log（`console.log('%c🐾 宠物中心 ' + BUILD_VERSION, ...)`，宠物中心一直有）、无新增 debug 遗留。**今日 0 项自动修复**——7 个 commit 全部是站主亲手打磨的 UX/视觉迭代，属工具设计取向 / 交互决策范畴，不属本 agent 应擅动的"小而无争议"改动；build 健康、`_site/` 结构无异常、workspace 干净（`git status` clean、`git ls-files --others --exclude-standard` 空）、无任何低风险小修可做。**P1 队列**：唯一 P1 承接 20 日的 `_config.yml`.`study_order` 未列 `interm-econometrics`（今日**第 21 日承接**），`_notes/study/interm-econometrics/interm-econometrics-2023.md` 仍在、`comm -23 <(ls _notes/study/) <(sed -n '/^study_order:/,/^[a-z]/p' _config.yml | grep '^  - ')` 差集仍只此一条——纯 IA 设计判断（保留 / 加进 study_order / 合并 `interm-metrics`），不擅动。**P2 队列**：承接 7-02 全部 P2（`linear-algebra-strang.md` 提到「本站中文《线性代数讲义》」但对应中文材料只以《经济学数学工具箱》线性代数部分 ch1-ch7 存在、`_flight-staging/` 目录名与 runner 生产后端角色不匹配、`bare_dollar.py` 启发式漏判、`spotcheck.py` `.tex` 探测启发式、`tutoring/` 7 篇缺 summary、`paid-test-us-visa-types.md` 缺 summary 且无法直接改、`mao-thought-principles.md` 无 summary 字段但正文有介绍段、`toolbox/random/` hover 缩进 cosmetic、mid-2015 与 anova-R 互链、掼蛋真机联机回归、宠物中心多浏览器验收、机票监控 mac 装机 / 卸装 / 更新真机验收、`toolbox/flight/` 5 HTML 多浏览器验收、《经济学数学工具箱》三项内容确认、jukebox 16 首问题首 + 3 失败首、5 条 DNS NameResolutionError 外链、`dead_links.py` SVG xmlns 命名空间误判），今日均**无新观察**、承接不变。此外今日改动新出以下**P2 新观察**：⑤ picker 权重语义在 7-02 一天内三连迭代（占比联动+锁定 → 动态量程 → 回归绝对语义）说明交互设计尚在收敛，建议真机 iPhone Safari + 桌面 Chrome 各拉一次 3~10 选项 / 锁 1~2 项 / 4 项等权对齐 / 长名 8 字 / 空选项禁抽 / 转盘 1% 细扇区 6 种场景手感回归；⑥ connect4 canvas 无 `keydown` / `tabindex` / `role=button` / `aria-label` —— 是历史状态、并非本次视觉重做引入的回归（`git show 6172d78 -- toolbox/connect4/index.html` diff 未涉及 a11y 属性），但既然 flight/pet 都有 a11y 通道，四子棋是否补一条键盘落子（← / → 移动列指示 + Enter 落子 + 焦点方框可视）可挪进"游戏 a11y 补齐"这条内容待办；⑦ 象棋/中象「对坐模式」新加了 CSS 转 180° + 触屏默认开的启发，仍需真机 iPad 竖 / 横屏、以及 iPhone Safari 横屏两台面对面下一整局验收（沙箱无触屏无法替代）。

### ✅ 本次已自动修复

无。

7 个 commit 全部由站主亲手打磨（picker 权重模型 / 转盘排文语义收敛、connect4 视觉重做与 4 bug 修、chess+xiangqi 幽灵子/超时托管/对坐模式、pet 手机端食物列表悬浮展开）——均属 UX/视觉设计取向决策，不属"小而无争议"范畴；build ✅ / `_site/` 结构与 7-02 一致 / workspace 干净 / 无低风险小修可做。

### 📋 待你把关

#### P0（紧急）

无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 ~ 7-02，**第 21 日承接**）。`/notes/` landing 渲染遍历 `site.study_order`（`notes/index.html` L81），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、120 页 Wooldridge 体系英文讲义、94 keywords 厚足覆盖）在 `/notes/index.html` 里**渲染不出来**（sitemap / search.json 仍正常工作，**仅** landing 缺）。今日核对：`ls _notes/study/` 仍 26 个目录（较昨日不变）、`study_order` 仍 25 条，`comm -23` 差集仍只 `interm-econometrics` 一条。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）仍属设计判断，请你拍板 —— 承接 21 日，是仓库里最久的 P1。

#### P2（建议）

1. **`linear-algebra-strang.md` summary 里「本站中文《线性代数讲义》」的引用**（承接 6-24 ~ 7-02，性质与 7-02 一致）—— 站上线代中文材料以《经济学数学工具箱》里 ch1-ch7 存在（`ch1_vector_spaces` / `ch2_rank_linear_systems` / `ch3_projection_ols` / `ch4_eigen_diagonalization` / `ch5_spectral_quadratic` / `ch6_svd` / `ch7_matrix_calculus` 7 章），但书名不同、面向经济学博士、并非独立线代教材。三种改法：① 保留字面等以后写独立中文《线性代数讲义》；② 改字面为「本站《经济学数学工具箱》线性代数部分（ch1-ch7）」并链过去；③ 删引用改自足介绍。**属内容写作 + 结构映射决策，请你拍板**。

2. **`_flight-staging/` 目录名与其内容实际角色不匹配**（承接 7-02，性质不变）—— 目录里的 `runner/` 已是**已上线机票监控工具的生产后端**（`flight/get:21` 硬编码从 `raw.githubusercontent.com/…/main/_flight-staging/runner/` 拉取，走 GitHub raw 而非 Jekyll，`_config.yml` exclude 拦不住外部 curl 读取），但目录名沿用「设计稿暂存」语义会误导。三种改法：① 保留名字（沉默约定）；② `runner/` 挪出到 `flightwatch/runner/` 需同步改 `flight/get:21` SRC 常量 + 新旧 URL 平滑迁移；③ `_flight-staging/` 改名 `_flightwatch/` 保 `_-`前缀防收录，只改 URL 前缀。**命名 / 迁移决策，请你拍板**。

3. **picker 权重语义 7-02 一天内三连迭代（占比联动+锁定 → 动态量程 → 绝对语义）待真机手感回归验收**（**今日新观察**）—— 建议 iPhone Safari + 桌面 Chrome 各拉一次 3~10 选项 / 锁 1~2 项 / 4 项等权对齐 / 长名 8 字 / 空选项禁抽 / 转盘 1% 细扇区**六种场景**手感回归，特别看：滑块拖动过程中"上限时该行回填真实值"是否直觉、锁定后未锁定项按比例补足是否与预期一致、转盘 8 字全角字排满半径的 cap8 上限在 1~8 字下字号是否稳定、空选项禁抽提示是否清晰、`resvg` 无头预览与真机浏览器渲染是否吻合。沙箱无 GUI / 无触屏跑不了。

4. **connect4 canvas 无键盘落子通道**（**今日新观察**）—— 历史状态、非本次视觉重做引入（`git show 6172d78 -- toolbox/connect4/index.html` diff 未涉及 a11y 属性），但既然 flight/pet 有 a11y 通道，四子棋可挪进"游戏 a11y 补齐"内容待办：补 `← / →` 移动列指示 + Enter 落子 + 焦点方框可视，是否加请你拍板。

5. **chess + xiangqi「对坐模式」新加的 CSS 转 180° 待真机 iPad / iPhone 横屏面对面下一整局验收**（**今日新观察**）—— 触屏默认开 + 桌面手动开关的启发是否合适、旋转后棋子拾放热区是否仍精准、与「每回合翻转」互斥切换是否顺滑、手机端(≤600px)中央倒计时药丸缩小后是否仍能清楚看到、超时托管夺权改「再次超时才代走 + 任何手动落子即解除」是否让"想走却走不了"消失。沙箱无触屏跑不了。

6. **`toolbox/pet` 宠物中心手机端食物列表**「悬浮展开」**新姿态待真机 iOS Safari + Android Chrome 双端验收**（**今日新观察**）—— 触发条定高 48px + 列表 max-height 46vh/360px 是否在 iPhone SE / iPhone 15 Pro Max / Pixel 5 各屏幕比例下都够展开数量、绝对定位盖住填写区是否遮挡关键 CTA、`▾ ↔ ▴` 切换与点外收起是否顺滑、桌面端"完全不变"承诺（`display: none`）是否 CSS 层面无泄漏。沙箱无触屏跑不了。

7. **`scripts/audit/bare_dollar.py` 启发式漏判 `$\d+-...$` 类数学配对**（承接 6-30 ~ 7-02）—— 今日**未跑** audit 脚本，老待办承接。

8. **`scripts/audit/spotcheck.py` 的 `.tex 源` 探测启发式仍漏判带主题后缀和异目录情形**（承接 6-27 ~ 7-02）—— 今日**未跑** audit 脚本，老待办承接。

9. **`_notes/tutoring/` 10 篇里 7 篇缺 `summary` 字段**（承接 6-30 ~ 7-02）—— 老文盘扫，内容写作决策。

10. **`_notes/life/paid-test-us-visa-types.md` 缺 `summary` 字段且无法直接改**（承接 6-30 ~ 7-02）—— 需改源文件 `_paid/liuxue-test-visa.md` 或改 `scripts/paywall/build_paid.py`。

11. **`_notes/study/mao-thought/mao-thought-principles.md` 无 `summary:` 字段但正文 L17 是介绍段落**（承接 6-29 ~ 7-02）—— 写作偏好；PDF-only 页面有正文时 `post.html` 兜底不触发，渲染上不缺。

12. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接 6-03 ~ 7-02，功能正确、纯排版风格小差异，可忽略。

13. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接 6-03 ~ 7-02，内容写作决策。

14. **掼蛋 6-18 ~ 6-24 联机改造 + 6-30 四象限版型迁移待真机 / 微信内置浏览器跑两局完整联机回归**（承接 6-27 ~ 7-02）。沙箱无浏览器 / 无音频出口无法替代真机回归。

15. **宠物中心近期多轮更新待多浏览器 / 多设备验收**（承接 6-29 ~ 7-02；本轮再加手机端食物列表悬浮展开两连；建议 iPhone Safari + Android Chrome + 桌面 Chrome + 桌面 Firefox + PWA standalone 至少五组合下过一遍）。沙箱无 GUI / 无真触屏，跑不了。

16. **机票监控 Phase 3 一键安装器 `flight/get` + Phase 2 后端 pipeline 待 mac 真机端到端跑一轮验收**（承接 7-02）—— `curl -fsSL https://ruizhou03.com/flight/get | bash -s -- <盯票码>` 完整入口 = 建 venv + Playwright + LaunchAgent + 首轮 + 定时的**装机链路**是否在**空白 mac**（未预装任何 flightwatch 相关物）上一次成功、以及**已装用户后续 flightwatch 命令**更新 runner 会不会因 `_flight-staging/` 名字变动等回归，建议真机装机 / 卸装 / 更新三步整流一次。沙箱无 mac 出口跑不了。

17. **`toolbox/flight/` 5 个 HTML 页 UX 待多浏览器 / 多屏幕跑一遍**（承接 7-02）—— `index.html` / `manual.html` / `handoff.html` / `ticket-detail.html` / `email-digest.html`，建议 iPhone Safari + Android Chrome + 桌面 Chrome + 桌面 Firefox + PWA "加装到主屏" 至少五组合下过完整配置→保存→交接→查看单票四步骤一遍。

18. **《经济学博士的数学工具箱》教材首发三项确认**（承接 7-02）—— ① summary 里 800 字长概述（现 L4）内容详实但对 landing 页 note-card 可能偏长（`_layouts/post.html` 与 `_includes/note-card.html` 处理超长 summary 的行为需核对）；② `sub_category=经济学数学基础` 是**新分类字符串**，若将来还有相邻教材（如"经济学统计基础"）值得先想清楚这条侧栏走向；③ `course=经济学数学工具箱` 是否要挂进 `_data/course_aliases.yml`（让读者搜"经济数学"、"math for economists" 等口语词也能找到）建议与 `search-keywords` skill 一并处理。

19. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 承接 6-18 ~ 7-02。

20. **5 条 DNS NameResolutionError 外链需站主在生产环境复验** —— 承接 6-08 ~ 7-02；今日**未跑** `dead_links.py`。

21. **`dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间字符串误判为外链** —— 承接 6-08 ~ 7-02，cosmetic 非阻塞。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化。** `git diff --stat 965babf..HEAD` 覆盖的 8 个文件全在 `toolbox/{picker,connect4,chess,xiangqi}/index.html` + `_includes/toolbox/pet/board.html` + `assets/{css/pet.css,js/pet.js,js/games/picker.js}`——纯代码改动，**未新增 / 未删除任何目录、未新增 / 未删除任何 `_notes/` `_data/` `files/` 条目**（`git diff --stat 965babf..HEAD -- '*.md' '_data/*' '_config.yml'` 空）。`git status` clean、`git ls-files --others --exclude-standard` 空、`find . -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、`find . -name "* 2.*"` 全空，无编辑器 / 系统垃圾。大文件核对：`files/or/or-2023.pdf` 5.55 MB 仍是唯一 5 MB 以上文件（`images.py` 潜在 pdfslim 候选、承接昨日）、`files/econ-math-toolkit/econ-math-toolkit.pdf` 3.02 MB + `files/interm-macro/interm-macro-2022-zh.pdf` 2.23 MB 仍是 2 MB 以上二人组、均低于 5 MB 阈值。`_paid/` + `_flight-staging/` 双双在 `_config.yml` L50/L52 exclude 列表内且 `_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空——七月首日双保险仍稳固。**结论**：目录结构与文件架构与 7-02 完全一致，仅工具/游戏代码行内调整，无仓库卫生可动项。

### 💓 后端脉搏 / 📬 读者来信

7 个 commit 均为前端工具代码打磨（picker 权重语义与转盘排文、connect4 canvas 视觉重做、chess/xiangqi 拖拽与超时托管、pet 手机端食物列表 UX），**未新增任何对 zircon-urge / leaderboards / zircon-comments waline / 付费墙 `/api/paid` `/api/redeem` 端点的依赖**。`backend_pulse.py` 本次未主动跑（沙箱无 fly.io 出口，承接 6-04 ~ 7-02 每次巡检结论），站点后端配置维持稳定。

---

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
