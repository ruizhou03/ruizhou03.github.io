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

## 2026-05-31

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周日 DOW=7，未跑 dead_links / orphan_files / pii_scan 三项周一项；orphan 手动跑了一次复核 NUL byte 误报状态）。距 5-30 巡检 10 个 commit，集中在三条线：`pet-food` 6 个（猫条/罐头计入 + 时间编辑 + 体重 + 新建食物估算 + 录入 UI 收紧 + 分段控件 app 化 + 成员动态铃铛）、`games` 横屏旋转、`guandan` 级牌金角标 + 逢人配出牌顶替、`cat-language` 新百宝箱（共享 `_includes/cat-soundboard.html` 与宠物中心猫语 tab）。**今日审计新发现 1 项无争议低风险已自动修复**：pet-food 暗色 toast hover 缺 `@media (hover: hover)` 守卫（同 5-29 guandan 同模式，紧挨着的明色版已正确守卫）；其余审计项与昨日同。P1 的 NUL byte 占位符 3 文件状态不变（仍需站主对照原图复核才能改）。

### ✅ 本次已自动修复

1. **`toolbox/pet-food/index.html` L440 `[data-theme="dark"] .link-toast .lt-undo:hover` 加 `@media (hover: hover)` 守卫** —— `hover_no_media.py` 报的全站唯一一处裸 `:hover`，紧挨着的 L433 明色版 `.link-toast .lt-undo:hover` 已包在 `@media (hover: hover)` 内；暗色变体（L440，从 5-30 `feat(pet-food) 共享 + 改时间`整体的 link-toast 模块挪过来时漏改）明显是配对漏改。fix：把单行 `[data-theme="dark"] .link-toast .lt-undo:hover { background: #7fb98f; color: #1a1a1a; }` 包进 `@media (hover: hover) { ... }`。复跑 `hover_no_media.py` 已 ✅ clean，`bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` 通过、零 warning、零 error（4.8 s）。本规则只控制 toast undo 按钮的暗色 hover 反色，触摸设备不再卡在亮起态。同 5-29 guandan 修法，性质一致——明色版已守、暗色版漏，是无争议小修。

### 📋 待你把关

#### P1（建议尽快，承接 5-29 → 5-30）

1. **3 个 .md 文件含 NUL byte (`\x00`) 包裹的占位符（M3 / M4 / CJK2 / CJK3 / CJK30）** —— `_notes/life/fridge-layout-guide.md` L157、`_notes/research/r-brucer-moderation-mediation.md` L59/L75、`_notes/research/latex-commands.md` L265，状态与 5-29 / 5-30 完全一致（今天又跑了 `python3 -c "import pathlib; [print(p) for p in pathlib.Path('_notes').rglob('*.md') if b'\\x00' in p.read_bytes()]"` 复核，3 文件仍在列）。占位符规律强烈暗示是某次自动化处理（imgslim / alt 生成 / fix_quotes 之类）把数学片段（`M{n}`）或中文术语（`CJK{n}`）先替换成 placeholder 再放回时漏了一步，且不知怎么用 NUL 当了分隔符。**今日 orphan_files 手动复核**：仍报 `r-brucer-moderation-mediation/27.jpg` 与 `28.jpg` 两处 false positive，root cause = NUL 让 git 把 .md 当二进制、`git grep` 跳过——这是同一个 P1 的副作用，修了 NUL byte 这两处自动消失。**没自动改的原因**：NUL 拆掉简单（共 8 个字节），但真正的原文（数字 / 术语）需要站主对照原图或导入源文件才能复原。`fridge-layout-guide` 是 5-26 才上的新文章，对用户可见的温度梯度乱码影响最严重；建议先处理这条。

#### P2（看心情，全部承接 5-29 → 5-30；本次扫描状态不变）

2. **`sw.js` PWA cache 前缀仍是 `zirconeey-`（4 处）** —— L20-22、L279。设计取向（cache key 重命名要带 LEGACY 回退），不擅改。

3. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 内部 prompt / 文档，属本机 / 历史标识符范畴。

4. **`scripts/daily_review.sh:15` 与 `scripts/hooks/{stop_publish_reminder,post_write_imgslim}.sh:10` 仍带 `REPO="/Users/zhourui/Desktop/..."` 本机绝对路径**（叠加 `scripts/{merge-psy-stat-II,compile-r-tutorials,build-psy-stat-II-rmd}.py` 中 9 处同类）。最小改动是 `REPO="$(cd "$(dirname "$0")/.." && pwd)"`，由站主拍板。

5. **toolbox 长文件继续膨胀**：本次 5-30 → 5-31 之间，`toolbox/pet-food/index.html` 从 **3980 → 5098 行**（+1118，pet-food 6 个 commit 含体重 / 营养估算 / 时间药丸 / 分段控件 app 化 / 成员动态铃铛），跻身全 toolbox 第 1；`assets/js/games/guandan.js` 从 **4822 → 4896 行**（+74，级牌金角标 + 逢人配出牌顶替）。`assets/js/doudizhu/ui.js` 维持 3884 行未变；`assets/js/doudizhu/ai.js` 维持 880 行未变。新增 `_includes/cat-soundboard.html` 266 行（共享组件，pet-food 猫语 tab 和 cat-language 独立页共用，这是好模式——把"页面级 inline"重抽成组件正是 P2#5 想要的方向）。延续 Round-3 P1#5「批量拆 `/assets/js/games/<name>.js`」清单：pet-food 5098 行单文件已是站点 inline 单文件之最，**建议优先级**由 P2 → 建议提到 P1：可参考 `_includes/cat-soundboard.html` 这次的成功抽取模式，把 pet-food 里相对独立的子模块（如 entry-form、history-list、bowl-weight modal、food-modal、bodyweight 区、活动 inbox、estimator 等）也抽成 `_includes/pet-food-*.html` 子组件，每个 200-500 行；inline `<style>` 同样可走 `_includes/pet-food-styles.html` 集中。**这是建议性方向，由站主拍板要不要做、什么时候做。** doudizhu 已完成 `engine.js + ai.js + ui.js` 三件套拆分（Round-2 P1 已收口）可作参考。

#### 🗒️ 待办清账（承接 5-30）

- **图片 alt / caption 覆盖**：`images.py` 仍 `missing_alt = 0` / `missing_caption = 0`（白名单 62 条），收口状态保持。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套全报 HTTP 403。不阻塞巡检；fly app 健康度未在本沙箱主动复查。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进，按原优先级排队。
- **`taichi-review-2023.md`「85 公里跑」**：仍候着，本次未触碰。
- **大图基线**（or-2023.pdf 5.30 MB + psy-stat-II-2023.pdf 2.70 MB + 12 张 500KB–1.5MB 图）：`images.py` 输出与昨日完全一致，无变化。
- **material_type 枚举 30 处不合规** / **文件名 `-YYYY` 后缀 77 处缺** / **sibling 互链 51 篇孤立**：长线设计项，全部沿用昨日状态。

### 🗂 仓库卫生

- **架构变化（5-30 → 5-31）**：**有一处可记的小架构变化**——`toolbox/cat-language/` 新增（commit `6701048`，全站工具 48 → 49 个，与 `_data/toolbox.yml` 49 条 `url` 一一对应、无孤儿、无悬空）；同时新增 `_includes/cat-soundboard.html` 266 行作为共享组件，被独立工具页和 pet-food 的「猫语」tab 复用（**这是把"页面级 inline"抽成组件的正面案例**，与 P2#5 拆 pet-food 的方向同源）；`files/audio/cat-language/` 新增 4 个 mp3（chatter/growl/pleading/siamese）+ 重剪 6 个旧 mp3（meow/hiss/purr/yowl/trill/demand），总 10 种。除此之外 10 个 commit 的去向：
  - `1773cbf → 6701048` 全部在 `pet-food`（6 个）+ `games 横屏旋转`（1 个）+ `guandan 级牌金角标`（1 个）+ `cat-language 新百宝箱`（1 个）。
  - 没有新增一级分类，没有新增内容文章。pet-food 主页面单文件已 5098 行，是本次 P2#5 的重点提示。
- **追踪卫生**：
  - 工作树扫描无 `.DS_Store`、无 `* 2.*` macOS 副本、无 `*.bak`/`*~`/`.synctex.gz`/`*.aux` 编辑器垃圾；`_site/`、`.jekyll-cache/`、`.jekyll-metadata`、`Gemfile.lock` 均被 `.gitignore` 正确忽略。
  - `console.log` / `debugger` / `TODO` / `FIXME` / `XXX` 残留扫描：今日新改的 5 个核心文件（`toolbox/pet-food/index.html`、`assets/js/games/guandan.js`、`assets/js/doudizhu/ui.js`、`_includes/cat-soundboard.html`、`toolbox/cat-language/index.html`）只有 5 处 `console.warn` / `console.error`，全部是**合理的错误日志**（异常 catch 内的诊断、submit rejected 提示等），非 stale debug；pet-food 的 `XXXXXX` 房间分享码占位符仍是 UI 文本不是 TODO。
  - 硬编码密钥扫描无新发现。
  - 本机绝对路径：见 P2#4，状态不变（沿用 5-30）。
- **构建健康**：`bundle exec ruby -e "require 'jekyll'; Jekyll::Commands::Build.process(...)"` 通过、零 warning、零 error（4.8 s）；`_site/` 大小与昨日基本同量（新增 `_site/toolbox/cat-language/index.html` ≈ 1.7 KB + `_site/files/audio/cat-language/` 10 个 mp3 共 313 KB；索引随新内容线性增长属正常）。`_site/` 根目录扫描确认 `DAILY_REVIEW.md` / `EMAIL_SUMMARY.md` / `SPOTCHECK_100_REPORT.md` / `SPOTCHECK_100_AGENT_REPORTS.md` / `TOOLBOX_AUDIT_REPORT.md` / `scripts/` / `backends/` / `.claude/` / `docs/` / `audio/` 全部正确 exclude。
- **前置字段一致性**：`frontmatter_yaml` ✅；`keywords_coverage` 散文 119 篇全部充足；`_notes/study/` 全部有 `discipline`；菜谱必填字段齐全。新文章 `_notes/life/cat-language.md` 仍存在（commit 6701048 改成科普文形式 + 引入声音板组件），keywords 状态由 keywords_coverage.py 复核通过。
- **百宝箱一致性**：`toolbox/` 下 **49 个工具子目录** ↔ `_data/toolbox.yml` 49 条 `url` 一一对应、无孤儿、无悬空（cat-language 新增已正确登记，category 生活、status live、icon 🐱、tagline 「点一下，循环听各种猫叫」）。
- **audit 全套结果**：keywords ✅ / images（基线 2 大 PDF）/ backend_pulse（沙箱 403）/ spotcheck（10 项抽检清单待 review）/ material_type（30 处⚠️长线）/ filename_convention（77 处⚠️长线）/ hover_no_media ✅（fix 后）/ sibling_crosslink（51 篇⚠️ 沿用 P1）/ bare_dollar ✅ / img_caption_md ✅ / svg_italic_zh ✅ / bare_url ✅ / frontmatter_yaml ✅；手动加跑的 orphan_files 仍报 2 处 false positive（r-brucer NUL byte 的副作用，sw 5-29 已记账）。
- **结论**：今日 1 项无争议自动修复（pet-food 暗色 toast hover 守卫），1 项 P1 持续待办（NUL byte，需站主原文复核），4 项 P2 持续待办（全部设计取向）。今日内容产能集中在 pet-food 深做 + cat-language 新工具（共享组件抽取是好模式），无新增一级分类。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）本次 `backend_pulse.py` 仍全报 HTTP 403。与 5-27 ~ 5-30 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。

---

## 2026-05-30

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周六，未跑 dead_links / orphan_files / pii_scan 三项周一项）。距 5-29 巡检 20 个 commit，全部集中在 `guandan` / `doudizhu` / `pet-food` 三个百宝箱的深做与一处英文站 theme-toggle 字段级对齐，没有新增内容目录或一级分类。**今日审计全套绿、无可安全自动修复项**——5-29 的 3 项已修（`TOOLBOX_AUDIT_REPORT.md` exclude / guandan hover guard / 2 文件 6 处裸 `$`）依旧成立；P1 的 NUL byte 占位符 3 文件状态不变（仍需站主对照原图复核才能改）。

### ✅ 本次已自动修复

无。今日 audit 全套 ✅ clean（keywords / hover_no_media / bare_dollar / img_caption_md / svg_italic_zh / bare_url / frontmatter_yaml 七项；images 仅基线 2 大 PDF；backend_pulse 沙箱 HTTP 403 已知；spotcheck 10 项为抽检清单不算 issue）。`bundle exec ruby -e "require 'jekyll'; Jekyll::Commands::Build.process(...)"` 通过、零 warning、零 error（13.5 s，本沙箱 binstubs 未生成所以走 ruby 直调而非 `bundle exec jekyll build`，构建结果等价）。`_site/` 根目录扫描确认 `DAILY_REVIEW.md` / `EMAIL_SUMMARY.md` / `SPOTCHECK_100_REPORT.md` / `SPOTCHECK_100_AGENT_REPORTS.md` / `TOOLBOX_AUDIT_REPORT.md` / `scripts/` / `backends/` 全部正确 exclude。

### 📋 待你把关

#### P1（建议尽快，承接 5-29）

1. **3 个 .md 文件含 NUL byte (`\x00`) 包裹的占位符（M3 / M4 / CJK2 / CJK3 / CJK30）** —— `_notes/life/fridge-layout-guide.md` L157、`_notes/research/r-brucer-moderation-mediation.md` L59/L75、`_notes/research/latex-commands.md` L265，状态与 5-29 完全一致（今天又跑了一遍 `python3 -c "import pathlib; ..."` 复核）。占位符规律强烈暗示是某次自动化处理（imgslim / alt 生成 / fix_quotes 之类）把数学片段（`M{n}`）或中文术语（`CJK{n}`）先替换成 placeholder 再放回时漏了一步，且不知怎么用 NUL 当了分隔符。**没自动改的原因**：NUL 拆掉简单（共 8 个字节），但真正的原文（数字 / 术语）需要站主对照原图或导入源文件才能复原。`fridge-layout-guide` 是 5-26 才上的新文章，对用户可见的温度梯度乱码影响最严重；建议先处理这条。检测命令：`python3 -c "import pathlib; [print(p) for p in pathlib.Path('_notes').rglob('*.md') if b'\\x00' in p.read_bytes()]"`。

#### P2（看心情，全部承接 5-29 → 5-28；本次扫描状态不变）

2. **`sw.js` PWA cache 前缀仍是 `zirconeey-`（4 处）** —— L20-22、L279。设计取向（cache key 重命名要带 LEGACY 回退），不擅改。

3. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 内部 prompt / 文档，属本机 / 历史标识符范畴。

4. **`scripts/daily_review.sh:15` 与 `scripts/hooks/{stop_publish_reminder,post_write_imgslim}.sh:10` 仍带 `REPO="/Users/zhourui/Desktop/..."` 本机绝对路径**（叠加 `scripts/{merge-psy-stat-II,compile-r-tutorials,build-psy-stat-II-rmd}.py` 中 9 处同类）。最小改动是 `REPO="$(cd "$(dirname "$0")/.." && pwd)"`，由站主拍板。

5. **toolbox 长文件继续膨胀**：本次 5-29 → 5-30 之间，`assets/js/games/guandan.js` 从 **4436 → 4822 行**（+386，guandan online 系列 6 个 commit），`toolbox/pet-food/index.html` 从 **3393 → 3980 行**（+587，pet-food 1 个 commit 含猫条 / 罐头 / 时间编辑大功能）。`assets/js/doudizhu/ui.js` 维持 3884 行，`assets/js/doudizhu/ai.js` 从 524 → 880 行（v2-deep + v3 记牌器训练）。延续 Round-3 P1#5「批量拆 `/assets/js/games/<name>.js`」清单。**建议方向**：doudizhu 已完成 `engine.js + ai.js + ui.js` 三件套拆分（Round-2 P1 已收口），可作为 guandan / pet-food 的拆分参考；scripts 目录里也已经有 `scripts/HANDOFF-doudizhu-ai-population.md` 这种「给下个对话用」的指导文档先例，做拆分时可以同样产出 handoff 文档。

#### 🗒️ 待办清账（承接 5-29）

- **图片 alt / caption 覆盖**：`images.py` 仍 `missing_alt = 0` / `missing_caption = 0`（白名单 62 条），收口状态保持。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套全报 HTTP 403。不阻塞巡检；fly app 健康度未在本沙箱主动复查。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进，按原优先级排队。
- **`taichi-review-2023.md`「85 公里跑」**：仍候着，本次未触碰。
- **大图基线**（or-2023.pdf 5.30 MB + psy-stat-II-2023.pdf 2.70 MB + 12 张 500KB–1.5MB 图）：`images.py` 输出与昨日完全一致，无变化。
- **material_type 枚举 30 处不合规** / **文件名 `-YYYY` 后缀 77 处缺** / **sibling 互链 51 篇孤立**：长线设计项，全部沿用昨日状态。

### 🗂 仓库卫生

- **架构变化（5-29 → 5-30）**：**结构层面无变化**——没有新一级分类、没有新内容目录、没有 toolbox 新增（仍 48 个工具子目录 ↔ `_data/toolbox.yml` 48 条 `url`，一一对应、无孤儿、无悬空）。20 个 commit 的去向（按 timeline 由早到晚）：
  - `c40a8bf docs(guandan-handoff)` — 286 行 plan，给下个对话用（属 scripts/，已 exclude）。
  - `c796c7d refactor(doudizhu)` + `93da07f feat(doudizhu) 三档群体训练` + `2b15105 feat(doudizhu) v2-deep` + `32f5f8a feat(doudizhu) v3 记牌器` + `d6d6398 chore(doudizhu) v3-deep 90 候选归档` — 共 5 commit，把斗地主 AI 从「同模型加噪降级」改造成「三档独立 ES 权重」，方法论复用自掼蛋；`scripts/sim-doudizhu-*.json` 是训练产物（已 exclude）。`assets/js/doudizhu/ai.js` 524 → 880 行。
  - `66223b5 fix(guandan lobby)` + `f10a7a6 fix(guandan)` + `101311a fix(guandan online) 联机直接开局` + `535aab9 fix(guandan online) 即时刷新` + `734fcc3 feat(guandan online) swap 滑动动画` + `2f112a2 fix(guandan online) swap hold` + `76bca9a fix(guandan online) per-seat in-flight 锁` + `eede692 fix(guandan online) lobby 头像位对齐` — 共 8 commit，掼蛋联机大厅/换座/动画连续打磨；`assets/js/games/guandan.js` 4436 → 4822 行。
  - `58ae91b feat(pet-food)` — 猫条 / 罐头计入总量 + 可改记录时间 + 改时间审批；`toolbox/pet-food/index.html` 3393 → 3980 行。
  - `7e8e640 chore: 后端工作副本归并到 backends/` — `.gitignore` + `_config.yml` exclude 都加了 `backends/`（这是 5-29 当晚的清理，符合「不该被 git 跟踪 / 不该公开」原则；本沙箱无 `backends/` 目录，已确认）。
  - `d351ee9` + `d0bbc09 fix(en) 深浅模式按钮 / theme-toggle CSS 字段级对齐中文站` — 共 2 commit，根 `index.html` L204-205 三处差异（`line-height:1` 多余 / `transition` 应为 all / hover 缺 color）已按中文站对齐；diff 看着干净，已与 `assets/css/main.css` 同步。
  - `0f3c636 perf(chess-ai) 根节点 α-β + quiescence 加 ply 上限` — `assets/js/games-shell/chess-ai.js` 30 行变更，单纯性能优化。
- **追踪卫生**：
  - 工作树扫描无 `.DS_Store`、无 `* 2.*` macOS 副本、无 `*.bak`/`*~`/`.synctex.gz`/`*.aux` 编辑器垃圾；`_site/`、`.jekyll-cache/`、`.jekyll-metadata`、`Gemfile.lock` 均被 `.gitignore` 正确忽略。
  - `console.log` / `debugger` / `TODO` / `FIXME` / `XXX` 残留扫描：今日新改的 4 个核心文件（`toolbox/pet-food/index.html`、`assets/js/games/guandan.js`、`assets/js/doudizhu/ai.js`、`assets/js/doudizhu/ui.js`）全部 0 命中 console/debugger；pet-food 一处 "XXX" 是 UI 占位文本 `<code class="pet-code">XXXXXX</code>`（房间分享码），非 TODO，正常。
  - 硬编码密钥扫描无新发现。
  - 本机绝对路径：见 P2#4，状态不变（5-29 已记账）。
- **构建健康**：`_site/` 大小与昨日基本同量（`assistant-fulltext.json` 1.83 MB / `assistant-index.json` 281 KB / `search.json` 227 KB，索引随新内容线性增长属正常）；零 warning、零 error。
- **前置字段一致性**：`frontmatter_yaml` ✅；`keywords_coverage` 散文 119 篇全部充足；`_notes/study/` 全部有 `discipline`；菜谱必填字段齐全。
- **audit 全套结果**：keywords ✅ / images（基线 2 大 PDF）/ backend_pulse（沙箱 403）/ spotcheck（10 项抽检清单待 review）/ material_type（30 处⚠️长线）/ filename_convention（77 处⚠️长线）/ hover_no_media ✅ / sibling_crosslink（51 篇⚠️ 沿用 P1）/ bare_dollar ✅ / img_caption_md ✅ / svg_italic_zh ✅ / bare_url ✅ / frontmatter_yaml ✅。
- **结论**：仓库结构较昨日无变化、且 5-29 已做过清理（`backends/` 收口），无需再优化。本日 0 项自动修复，1 项 P1 持续待办（NUL byte），4 项 P2 持续待办（全部设计取向）。今日内容产能完全在游戏 AI / 联机大厅这条线上，没有写入新的内容文章。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）本次 `backend_pulse.py` 仍全报 HTTP 403。与 5-27 ~ 5-29 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。

---

## 2026-05-29

### ✅ 本次已自动修复

1. **`TOOLBOX_AUDIT_REPORT.md` 不再发布到公开站点** —— 5-26 / 5-27 已经把 `SPOTCHECK_100_REPORT.md` 与 `SPOTCHECK_100_AGENT_REPORTS.md` 加进 `_config.yml` exclude；同源的另一份 13 KB 内部审查文档（commit `52f0ab0`，2026-05-27 落地，含"由主对话整合 7 组并行 Explore agent 的发现 + 主对话亲自复核"等内部语境）当时漏了。今天 `bundle exec jekyll build` 后扫 `_site/` 根，看到 `_site/TOOLBOX_AUDIT_REPORT.md` 被原样拷出。已在 exclude 列表中 `SPOTCHECK_100_AGENT_REPORTS.md` 下方一行追加 `TOOLBOX_AUDIT_REPORT.md`，重建后 `ls _site/*.md` 已无残留（leak count = 0）。文件本身保留在仓库根作为内部记录，未动 git 历史。这是 5-26→5-27→5-28 同类巡检的第三次发现的同模式遗漏，至此根级三份内部 audit 报告全部就位。

2. **`toolbox/guandan/index.html` L625 `.gd-btn.on:hover` 加 `@media (hover: hover)` 守卫** —— `hover_no_media.py` 报的全站唯一一处裸 `:hover`，紧挨着的 L607-609 与 L615-617 同类规则都正确包在 `@media (hover: hover)` 内、L630-632 也包了，明显是这一条漏改。fix：把单行 `.gd-btn.on:hover:not(:disabled) { color: #fff; filter: brightness(1.08); }` 包进 `@media (hover: hover) { ... }`。复跑 `hover_no_media.py` 已 ✅ clean，`bundle exec jekyll build` 通过。本规则只控制按钮高亮色，触摸设备不再卡在亮起态。

3. **2 篇生活攻略新文里 6 处裸 `$` 金额转义** —— `bare_dollar.py` 报的 2 个文件 / 6 处，全部是 5-25 ~ 5-27 新发布文章里 USD 金额未转义、会被 KaTeX 配对吃成公式：
   - `_notes/life/drinking-water-types.md`：L159 壶式 `$30-50` + 滤芯 `$5-10/月`；L163 整机 `$300-800` + 滤芯 `$50-100/年`；L241 Sawyer Mini `$25 左右`（5 处）
   - `_notes/life/condoms-guide.md`：L344 水基润滑剂 `$10 一瓶`（1 处）
   - 用 `python3 scripts/fix_dollar.py _notes/life/condoms-guide.md _notes/life/drinking-water-types.md` 一键改为 `\$`。复跑 `bare_dollar.py` 已 ✅ clean。

`bundle exec jekyll build` 验证通过、零 warning、零 error（6.8 s）。

### 📋 待你把关

#### P1（建议尽快）

1. **3 个 .md 文件含 NUL byte (`\x00`) 包裹的占位符，导致前台显示"M3 / M4 / CJK2 / CJK3 / CJK30"等乱码** —— 本次扫 `_notes/` 二进制字节时发现：
   - `_notes/life/fridge-layout-guide.md` L157（5-26 新文章）：`<p class="img-caption">温度差 \x00M3\x00 ℃ 听起来不多……（Q10 系数 \x00M4\x00）</p>`，前台渲染成 `温度差  M3  ℃` / `Q10 系数  M4 `（已通过 `_site/life/fridge-layout-guide.html:317` 复核确认对读者可见）。
   - `_notes/research/r-brucer-moderation-mediation.md` L59 / L75：两张图片 alt 文本里 `\x00CJK2\x00` 与 `\x00CJK3\x00`，前台 11.jpg / 19.jpg 的 `alt=` 都是这串占位符。alt-text 错读屏听众听到的就是 "CJK2"。
   - `_notes/research/latex-commands.md` L265：`<span>` 里 `用来微调 \x00CJK30\x00 和括号之间的距离`，前台 `_site/.../latex-commands.html:418` 可见 `用来微调  CJK30  和括号之间的距离`。
   - **占位符规律强烈暗示来源**：`M{n}` 是第 n 个被替换出去的数学片段（如 LaTeX `$3$`/`$\approx 2$`）；`CJK{n}` 是被替换出去的中文术语。看上去像某次自动化处理（imgslim 链路？alt 生成？）把这些片段先替换成 placeholder 再放回去时漏了一步，且不知怎么用 NUL 当了分隔符。
   - **影响**：① 用户可见乱码（fridge-layout-guide 是 5-26 才上的新文章，影响最严重）；② NUL 字节让 git 把这 3 个 .md 当二进制文件，`git grep` 与 `orphan_files.py` 在这些文件里漏检（本次 `r-brucer-moderation-mediation/{27,28}.jpg` 的孤儿误报就是这么来的——文件实际引用了，但 git 当二进制不搜）；③ 后续 fix_quotes / 其他 routine 脚本可能继续把这两条遗漏放大。
   - **我没自动改**：NUL 拆掉容易（4 + 2 + 2 = 8 个字节），但**真正的原文（数字/术语）需要你对照原图或导入源文件才能复原**，盲改会留更深 bug。建议站主先看一下 fridge-layout 的两张图（应该是温度梯度示意 / Q10 系数引述），再决定 M3/M4 是哪两个具体数；r-brucer 的 CJK2/CJK3 看一下 11.jpg / 19.jpg 标题；latex-commands 的 CJK30 是描述哪个字符。
   - **检测方法**：`python3 -c "import os, pathlib; [print(p) for p in pathlib.Path('_notes').rglob('*.md') if b'\\x00' in p.read_bytes()]"`；以后可以挂进 daily routine。

#### P2（看心情，继承自 5-28）

2. **`sw.js` PWA cache 前缀仍是 `zirconeey-`（4 处）** —— 5-28 列过；本次扫描状态不变。设计取向类（cache key 重命名要带 LEGACY 回退），不擅自改。

3. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里还称"zirconeey 站"** —— 5-28 列过；本次扫描状态不变（属本机/历史标识符范畴）。

4. **`scripts/daily_review.sh:15` 与 `scripts/hooks/{stop_publish_reminder,post_write_imgslim}.sh:10` 仍带 `REPO="/Users/zhourui/Desktop/..."` 本机绝对路径** —— 5-28 列过；本次状态不变。**额外注意**：今天复扫还在 `scripts/{merge-psy-stat-II,compile-r-tutorials,build-psy-stat-II-rmd}.py` 里查到 9 处同样的本机绝对路径（构建工具脚本，仅本机跑），与 P2#3 同性质，叠加进同一条待办。

5. **toolbox 长文件**：本次 5-23 → 5-29 新增的 `toolbox/pet-food/index.html` 一冲到 **3393 行**（含 inline CSS + JS + 8 个 SVG icon），超过 Round-3 标记的 1500 行阈值，跻身 toolbox 第 1 大。`assets/js/games/guandan.js` 60 多 commit 后到 **4436 行**（仅次于 doudizhu/ui.js 的 3602），也越线了。延续 Round-3 P1#5「批量拆 `/assets/js/games/<name>.js`」清单。**建议**：guandan 已有 `assets/js/games/guandan.js`，可考虑把 `toolbox/guandan/index.html` 里的 inline `<style>` / 剩余脚手架进一步抽出去；pet-food 走相同路线。

#### 🗒️ 待办清账（承接 5-28）

- **图片 alt / caption 覆盖**：`images.py` 当前仍是 `missing_alt = 0` / `missing_caption = 0`（白名单 62 条），保持收口状态。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套全报 HTTP 403。不阻塞巡检；fly app 健康度未在本沙箱主动复查。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进，按原优先级排队。
- **`taichi-review-2023.md`「85 公里跑」**：仍候着，本次未触碰。
- **大图基线**（or-2023.pdf 5.30 MB + psy-stat-II-2023.pdf 2.70 MB + 12 张 500KB–1.5MB 图）：`images.py` 输出与昨日基本一致；本次新增 `psy-stat-II-2023.pdf` 2.70 MB（5-25 合并期中/期末后的新主笔记，属合理基线）。
- **material_type 枚举 30 处不合规**：course-reviews ×18、经验之谈 ×5、错题本 ×3、写作 ×2、口语 ×1、词汇 ×1。是 layout-level schema 决策，属 P1 长线项目。
- **文件名 `-YYYY` 后缀 77 处缺**：长线设计项。

### 🗂 仓库卫生

- **架构变化（5-28 → 5-29）**：60+ commits 跨度大，但**结构层面无新增一级分类、无新增内容目录**。变化全在「已有目录里加内容/打磨」：
  - **`toolbox/` 新增 3 个工具**（`font-style` / `pet-food` / `recipes`），与 `_data/toolbox.yml` 一一对应（DATA: 48, DIRS: 48, 无孤儿无悬空）；总数从 5-28 的 45 升到 48。
  - **`_notes/life/` 新增 17 篇**（5-23 ~ 5-27 集中产出，含本次裸 `$` 修复的两篇 + NUL byte 待办的 fridge-layout-guide + 其它科普文）；新增内容全部 `keywords:` 充足（`keywords_coverage.py` ✅ clean）。
  - **guandan 深度重做**：20+ commits 集中在 AI 调参（self-play sim → ES tuner → per-difficulty 权重 → 1-step lookahead）+ UI 大改（进贡动画、加倍阶段、结算画面、lobby 桌面化等），`assets/js/games/guandan.js` 涨到 4436 行。
  - **pet-food 深度重做**：16+ commits（共享/碗重/估算器/年龄分档/品种 dropdown 等），`toolbox/pet-food/index.html` 涨到 3393 行。
  - **`scripts/sim-guandan.js` 新建**（5-24 落地，self-play 模拟器，仅本机跑，已在 `scripts/` exclude 内不进 `_site`）。
  - **3 个 prompt.md + 1 个 chore commit** 同步了 `daily_review.prompt.md` 的「前置验证红线」与 prompts 里的站名（`917f3f6`）。
- **追踪卫生**：
  - 工作树扫描无 `.DS_Store`、无 `* 2.*` macOS 副本、无 `*.bak`/`*~`/`.synctex.gz`/`*.aux` 编辑器垃圾；`_site/`、`.jekyll-cache/`、`.jekyll-metadata` 已被 `.gitignore` 正确忽略。
  - 硬编码密钥扫描无新发现（`grep -rEn "(API_KEY|SECRET_KEY|AUTH_TOKEN|PASSWORD)\s*=\s*['\"][A-Za-z0-9_-]{8,}"` 全 repo 命中为零）。
  - 本机绝对路径：见 P2#4（3 个 sh 脚本 + 3 个 .py 构建工具脚本，共 ≥12 处；性质均为本机 build/routine 脚本，不是密钥泄漏）。
- **构建健康**：`bundle exec jekyll build` 通过、零 warning、零 error（6.8 s）；`_site/` 不含 `DAILY_REVIEW.md` / `EMAIL_SUMMARY.md` / `SPOTCHECK_100_REPORT.md` / `SPOTCHECK_100_AGENT_REPORTS.md` / `TOOLBOX_AUDIT_REPORT.md` / `docs/` / `.claude/` / `scripts/` / `tools/` / `audio/`。
- **前置字段一致性**：263 篇 `_notes` 中 262 篇 published（1 篇 `condoms-guide.md` `published: false`，是有意的草稿状态）；`_notes/study/` 全部有 `discipline`；菜谱必填字段齐全；`keywords_coverage.py` 报散文 119 篇 `keywords:` 全部充足；`frontmatter_yaml.py` ✅ clean。
- **百宝箱一致性**：`toolbox/` 下 **48 个工具子目录**（5-28 的 45 + 新增 `font-style`/`pet-food`/`recipes`）与 `_data/toolbox.yml` 48 条 `url` 登记一一对应，无孤儿、无悬空。
- **audit 全套结果**：keywords ✅ / images（基线 2 处大文件 PDF） / backend_pulse（沙箱 HTTP 403）/ spotcheck（10 项配额式抽检列表生成正常，待 review）/ material_type（30 处⚠️）/ filename_convention（77 处⚠️）/ hover_no_media ✅（fix 后）/ sibling_crosslink（51 篇⚠️ 沿用 P1）/ bare_dollar ✅（fix 后）/ img_caption_md ✅ / svg_italic_zh ✅ / bare_url ✅ / frontmatter_yaml ✅；今日加跑的 orphan_files 报 2 处 false positive（root cause = P1#1 的 NUL byte 让 git 当二进制）。
- **结论**：3 项自动修复（TOOLBOX_AUDIT_REPORT exclude + guandan hover guard + 2 文件 6 处裸 `$`），1 项新增 P1（3 文件 NUL byte 占位符，用户可见乱码，需要原文复核才能修，不擅改）。其余 P2 全是承接的设计取向类待办。

### 💓 后端脉搏 / 📬 读者来信

- 后端三件套（zircon-urge / leaderboards / zircon-comments waline）本次 `backend_pulse.py` 全报 HTTP 403。与 5-27 / 5-28 同因，**沙箱无 fly.io 出口**；不阻塞巡检，未主动重启 fly app。

---

## 2026-05-28

### ✅ 本次已自动修复

1. **4 个 SKILL.md 的 `description` 字段统一为 `ruizhou03.github.io`**
   - 现象：`.claude/skills/{search-keywords,recipe,image-caption,new-post}/SKILL.md` 的 front-matter `description` 字段仍写「zirconeey.github.io」，但站点早在 2026-05 已经合并为 `ruizhou03/ruizhou03.github.io`（见 `4a487b9 feat(merge): 中英文双站合并` + `c15b3c9 docs(merge): 重写 MAINTENANCE.md`），同目录的 `wechat-export` 已对齐为 `ruizhou03.github.io`。
   - 影响：`description` 是 Claude session 启动时显示给我的 skill 元数据（system-reminder 里能看到），写着旧域名会让 Claude 把站点身份误判为"zirconeey 站"，潜在影响 skill 调用时的判断。**这不是"本机标识符"——`MAINTENANCE.md` 第 25 行豁免的本机字样指的是钩子/脚本/LaunchAgent 这类内部标识符，对外描述应跟实际站点身份对齐。**
   - 处理：4 个 `description` 字段都把 `zirconeey.github.io` 改成 `ruizhou03.github.io`；`image-caption` 里第二处「zirconeey 站的固定格式」改为「本站的固定格式」（避免重复啰嗦）。
   - 复构建：`jekyll build` 通过、零 warning（`.claude/` 在 exclude 内、不会影响 `_site/`）。
   - 验证：本 session 内 system-reminder 重新加载 skills 列表时已显示新 description。

### 📋 待你把关

#### P1（有空再做）

1. **`sw.js` 里 PWA cache 前缀仍是 `zirconeey-`（4 处）**
   - 位置：`sw.js:20-22` 与 `sw.js:279`，cache 名 `zirconeey-pages` / `zirconeey-assets`，`LEGACY_PREFIXES` 数组里也是 `zirconeey-shell-/pages-v/assets-v`。
   - 影响：仅是浏览器端 cache key 的命名，**不影响功能**。看着旧名字觉得别扭可以改成 `ruizhou03-`；改时把当前的 `zirconeey-pages` / `zirconeey-assets` 也写进 `LEGACY_PREFIXES`，让老访客的旧 cache 在下次 SW activate 时被 delete 掉。
   - 我没自动改：PWA cache rename 涉及用户端缓存清理路径，属设计取向（且新名字到底叫 `ruizhou03-` 还是 `rz-` 还是别的，由你定）。

2. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL 正文里还称"zirconeey 站"**
   - 已知位置：`scripts/email_summary.prompt.md:1`、`scripts/daily_review.prompt.md:1,23`、`.claude/skills/wechat-export/SKILL.md:8,46`、`.claude/skills/search-keywords/SKILL.md` 等正文若干处（description 已修，正文里"zirconeey 站"称呼还在）。
   - 影响：这些是给 Claude 看的 system prompt 与 skill 正文，跟当前实际站身份不一致；但都是内部文档，不影响公开站，**改 vs 不改属设计取向**。
   - 我没自动改：description 4 处是无争议小修；正文段落里的"zirconeey 站"称呼属于「本机/历史标识符」范畴，按 `MAINTENANCE.md:25` 的指引由你决定要不要批量替换。

#### P2（看心情）

3. **`scripts/daily_review.sh:15` 与 `scripts/hooks/{stop_publish_reminder,post_write_imgslim}.sh:10` 仍有 `REPO="/Users/zhourui/Desktop/..."` 本机绝对路径**
   - 5-23 的 `443febc chore(email-summary): 脱敏本机绝对路径，plist 改走 .template` 已经把 `email_summary.sh` 与 `io.github.zirconeey.email-summary.plist` 都脱敏了（plist 改走 `.template`），但同模式的 daily-review 与两个 hooks 脚本里 `REPO=` 这一行**没跟着改**。
   - 影响：把 macOS 本机用户名 `zhourui` 与桌面目录结构继续暴露在公开仓库里。**不是密钥泄漏。**
   - 建议：跟当时 email-summary 一样的最小改动——`REPO="$(cd "$(dirname "$0")/.." && pwd)"`（脚本会自己定位仓库根，不依赖绝对路径）。三处都改即可。
   - 我没自动改：与 5-23 已修批次同性质，设计取向交你拍板。

#### 🗒️ 待办清账（承接 5-27）

- **图片 alt / caption 覆盖**：`images.py` 当前 `missing_alt = 0`、`missing_caption = 0`（`caption_whitelist.txt` 62 条人工确认误报全部豁免），之前积压的「414 处缺 alt」「65 处疑似漏 caption」已收口。
- **`SPOTCHECK_100_AGENT_REPORTS.md` exclude**：5-27 已加入 `_config.yml` exclude，本次 `_site/` 验证未再外泄。
- **后端脉搏（5-27 报的 `backend_pulse.py` 失败）**：本沙箱仍无 fly.io 出口（`dead_links.py` 也对 fly.dev 端点全报 403/连不上），不阻塞巡检，仅记录。本次未主动复查 fly app。
- **Round-3 留下的 ~68 个 P1**：未在本次范围内推进，按原优先级排队。
- **`taichi-review-2023.md`「85 公里跑」**：5-27 仍候着，本次未触碰。
- **大图基线**（or-2023.pdf 5.30 MB + 12 张 500KB–1.5MB 图）：本次 `images.py` 输出与昨日完全一致，无变化。

### 🗂 仓库卫生

- **架构变化（5-27 之后新增）**：5-27 报告与今天之间只多了 3 个 commit（`6a7427d` assistant 头部浅色化 + `d884075` 全文检索库 + `c2b0f11` 本机文件夹改名 + `f0fbc97` email-summary HTML 渲染），属现有 routine 的微调，无新增内容目录或文件类型；本次自动修复的 4 个 SKILL.md 是 `c2b0f11` 改名 commit 的边角遗漏。**结构层面相对昨日无实质变化。** 站点更早的几大架构变动（中英文双站合并 / podcast / flight-watch / assistant 起步 / 猫语文章 / Round-3 抽检）已经在 5-26 / 5-27 巡检里完整覆盖，本节不再赘述——
  - `c2b0f11` 本机文件夹改名 commit 把三个本机 `REPO=` 脚本与 4 个 SKILL.md 顶部的「仓库根」声明都改了路径，但 4 个 SKILL.md 的 `description` front-matter 字段漏改（本次已修）。
  - `f0fbc97 feat(email-summary): HTML 渲染 + 实质摘要 + 纳入全部未读邮件`——email-summary routine 的可读性增强，纯 routine 内部，不影响公开站。
  - `d884075` 新增 `assistant-fulltext.json` liquid 模板源（789 B），构建后展开为 1.5 MB 全文检索库；属 assistant 小助手的能力升级。
- **追踪卫生**：
  - 工作树扫描无 `.DS_Store`、无 `* 2.*` macOS 副本、无 `*.bak`/`*~` 编辑器垃圾；`_site/`、`.jekyll-cache/` 已被 `.gitignore` 正确忽略。
  - 硬编码密钥扫描无新发现（`grep -E "(API_KEY|SECRET|TOKEN|PASSWORD)\\s*=\\s*['\"]"` 全 repo 命中为零）。
  - 本机绝对路径：3 处脚本（见 P2#3）+ `_notes/research/reproducible-project.md` 中 `/Users/zircon/...`（教学反面教材的代码示例，不是泄漏）+ `.claude/skills/*/SKILL.md` 顶部「仓库根：/Users/zhourui/...」声明（本机标识符）+ `docs/ARCHITECTURE_REVIEW.md` 两个 `file:///Users/zhourui/...` 链接（本机 Claude project memory 路径）。
- **构建健康**：`jekyll build` 通过、零 warning、零 error；`_site/` 不含 `DAILY_REVIEW.md`、`EMAIL_SUMMARY.md`、`docs/`。
- **前置字段一致性**：246 篇 `_notes` 全部有 `main_category`；`_notes/study/` 全部有 `discipline`；32 篇菜谱必填字段齐全；**246/246 篇有 `keywords:`**（含新文章 cat-language）。
- **百宝箱一致性**：`toolbox/` 下 45 个工具子目录与 `_data/toolbox.yml` 的 45 条 `url` 登记一一对应，无孤儿、无悬空。
- **assistant 索引文件**：源 `assistant-fulltext.json` 仅 789 B（liquid 模板），构建后 `_site/assistant-fulltext.json` 1.5 MB / `_site/assistant-index.json` 213 KB，是全文检索预期大小，正常。
- **结论**：本次仅一项自动修复（SKILL description 域名对齐），仓库结构与卫生整体很干净，剩余待办全部是设计取向类（domain rename 的边角清理）。

---

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
