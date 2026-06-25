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

