# 站点接手手册

写给接手这个网站的人（人或 AI）。目标：读完能独立维护，不至于好心办坏事。

> **可信度说明**（重要）。本手册分两类内容：
> - **已实测**：本次编写时用命令实证过的（数量、路径、配置值），可直接采信。
> - **据项目记录**：来自 `CLAUDE.md`、`docs/` 旧文档与项目记忆的转述，写作时**未逐条复核**。这类我都标了「据记录」。动手前请自行核实一遍。
>
> 另有几处明确的**待确认项**，集中在第 11 章，别当成已知事实用。
>
> 撰写日期：2026-07-20。站点变化很快（4 个月 1700 次提交），超过三个月请怀疑本文。

---

## 1. 这是什么站

### 一句话

周睿（Rui Zhou，宾夕法尼亚州立大学经济学 PhD）的个人网站。**一个 Jekyll 仓库，英文当学术门面，中文在 `/zh/` 及各栏目下**，部署在 GitHub Pages，域名 `ruizhou03.com`。

### 三重身份

这个站不是单一用途的博客，它同时是三样东西，看清这点才能理解它为什么这么复杂：

| 身份 | 面向谁 | 体现在哪 |
|---|---|---|
| **学术门面** | 学术同行、招聘方 | 根 `index.html` 英文主页、CV、research |
| **资料档案库** | 中文学生读者、自己 | 生产分支 270 篇笔记 + 125 个 PDF 的课程资料与自著讲义 |
| **玩具箱 / 产品试验场** | 少量真实用户、自己 | 49 个目录工具与小游戏、账号体系、积分、收藏、评论 |

第三重是这个站的异常之处。多数个人站没有用户系统和后端；这个站有完整的账号、JWT 鉴权、积分等级、多收藏夹、联机对战和管理后台，动态生产环境目前跑在两个 fly.io 应用上。**接手成本主要来自第三重。**

### 规模（已实测）

| 维度 | 数字 |
|---|---|
| 内容 | 生产分支 `_notes/` 270 篇 markdown（本机另有 2 篇未跟踪 WIP） |
| 资料 | 生产分支 `files/` 126 MB，125 个 PDF（本机另有未跟踪资料） |
| 工具箱 | `_data/toolbox.yml` 49 个目录项，约 64,300 行 HTML/JS；另有兼容/附属路由 |
| 模板 | 3 个 layout，28 个 include |
| 脚本 | 生产分支 `scripts/` 约 88 个文件（含 2026-07 新增备份工具） |
| 仓库 | 1.0 GB 总体积，其中 `.git` 275 MB |
| 历史 | 1700 次提交，起于 2026-04-16 |

提交节奏：4 月 307、5 月 706、6 月 399、7 月 288。**这是一个高强度单人开发的站，不是低维护的静态博客。**

### 谁在用（诚实版）

**用户规模仍待从控制台核实，但并非完全没有统计。** GA4（`G-L6TCM0XFJ9`）只埋在 `index.html` 和 `zh/index.html` 两个首页；与此同时，Cloudflare Web Analytics 已埋入 `default.html` 和两个独立首页，覆盖全站页面。当前口径定为：**Cloudflare 是全站访客 / 来源 / 设备的主统计，GA4 只作两个首页的历史辅助口径。** 管理后台读取 Cloudflare 数据还依赖 urge 的 `CF_API_TOKEN` / `CF_ACCOUNT_ID`。

账号规模在 Upstash Redis；评论与阅读量在 Waline PostgreSQL，不在 Redis。真实用户数、评论数与日活仍需从两个数据源分别核实。

---

## 2. 接手第一天

### 要拿到的权限

| 服务 | 用途 | 备注 |
|---|---|---|
| GitHub `ruizhou03/ruizhou03.github.io` | 代码 + 部署 | push main 即上线 |
| Cloudflare Registrar | `ruizhou03.com` | RDAP 到期日 2027-05-27；2026-07-20 已确认自动续费、付款方式与联系人正常 |
| fly.io | `zircon-urge`、`zircon-comments` | 动态生产后端与密钥；2026-07-20 账号下未发现 `zircon-mcp` app |
| Upstash Redis | urge 动态数据 | 账号、积分、收藏、排行榜、存档；**不含评论** |
| Neon PostgreSQL | Waline 数据 | 评论、回复、评论邮箱、页面阅读量 |
| Cloudflare R2 | 音频托管（歌单、播客） | 公共域名见 `_config.yml` 的 `podcast_base` |
| Google Cloud | OAuth 登录 + GA4 | 登录靠它，挂了全站登录挂 |

**密钥都不在仓库里**，在 fly secrets 和本机。接手时必须让原作者逐个交接，这是最大的单点风险（见第 11 章）。

### 本地起环境

```bash
git clone https://github.com/ruizhou03/ruizhou03.github.io.git
cd ruizhou03.github.io
bundle install
bundle exec jekyll serve --livereload    # → http://localhost:4000
```

本机已用 `gh auth login` 登录 `ruizhou03`，Git 凭据由 macOS Keychain 保存，仓库默认使用 HTTPS。旧 SSH 私钥仍保留，但不再作为本仓库的发布凭据。

### 最小上线闭环

改文件 → `git add <具体文件>` → `git commit` → `git push origin main` → 等 1–2 分钟 GitHub Pages 构建 → 刷新线上验证。

**没有 staging，push main 就是生产。**

### 五条铁律

1. **只提交自己这轮改的文件。禁止 `git add -A` / `git add .`**。这个仓库经常有多个会话并发在改不同东西，混提会污染历史、提前部署别人没写完的东西。出过两次事故才立的规矩。
2. **主干开发，不开长命分支**。GitHub Pages 只构建 `main`，其它分支线上完全不可见。要隔离用 `git worktree` 开短命分支，同一会话内**真合并**（`git merge`）回 main，合完立刻删。
3. **绝不把分支改动「重抄一遍」到 main**。会制造「同内容不同 SHA」的提交，此后每次合并都在相同几行重复冲突。这个坑犯过两次。
4. **别擅动字体栈**（Cormorant + Noto Serif SC）。是站点视觉标志，改前先问。
5. **遗留私有正文与版权音频绝不进仓库**。`_paid/` 和音频走 gitignore + 构建排除双保险。

### 工作区是脏的又要上线

别在脏工作区里切分支/stash。开隔离 worktree：

```bash
git worktree add -B tmp /tmp/land origin/main
cd /tmp/land
# 只改你那一两个文件
git add <具体文件> && git commit
git fetch origin main && git rebase origin/main
git push origin HEAD:main
cd - && git worktree remove /tmp/land
```

land 完回主工作区把本地 main 收回去：`git fetch origin main && git reset --hard origin/main`。**不这么做，本地 main 会攒下和远端同内容不同 SHA 的孤儿提交**——这个坑 2026-06-04 复发过一次。

---

## 3. 底层架构

```
                    浏览器
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   GitHub Pages   Service Worker   fly.io 后端
   (静态托管)      (离线缓存)      (动态能力)
        │                             │
        │                   Upstash Redis + PostgreSQL
   Jekyll 构建              (账号/积分/收藏/排行 / 评论)
        │
   ┌────┴────┐
_notes/   toolbox/   files/   assets/
(内容)    (工具)     (PDF)    (样式图片)
```

**分层说明**：

- **静态层**：Jekyll（本地 4.3 / Pages 3.10）→ GitHub Pages。所有页面都是构建期生成的静态 HTML。
- **内容层**：全部在 `_notes/` collection，**没有用 `_posts/`**。分类靠 front-matter 字段，见第 4 章。
- **模板层**：`_layouts/`（3 个）+ `_includes/`（28 个）+ `assets/css/`。CSS 已从内联抽成外部文件可跨页缓存。
- **客户端增强层**：`sw.js`（23 KB）做 PWA 与离线缓存。整站是 PWA，单个工具还能装成独立 APP。
- **后端层**：两个 fly 生产 app，见第 6 章。前端通过 fetch 调用，CORS 全开（`*`），**所以换域名不用改后端**。另有未部署的 MCP 包装源码。
- **自动化层**：`scripts/` 下的巡检、每日 review、邮件总结、机票监控，靠 LaunchAgent 和远程 routine 调度。

**关键边界**：静态层挂了整站挂；后端挂了只影响评论/排行榜/登录，**文章和工具照常可读可玩**。这个降级特性是有意的，别把核心内容依赖搬到后端去。

---

## 4. 内容体系

### 目录与栏目（已实测篇数）

| 目录 | 篇数 | 栏目 |
|---|---|---|
| `_notes/life/` | 122 | 生活攻略 |
| `_notes/study/` | 76 | 学习资料 |
| `_notes/research/` | 24 | 科研妙招 |
| `_notes/course-reviews/` | 18 | 课程测评 |
| `_notes/tutoring/` | 10 | 学习辅导资料 |
| `_notes/essays/` | 7 | 随笔漫谈 |
| `_notes/gre/` | 7 | GRE |
| `_notes/toefl/` | 6 | TOEFL |

### 两套分类，是刻意的，别去统一

- **博客型**（生活攻略 / 科研妙招 / 随笔漫谈）：按话题和时间读。字段 `main_category` + `sub_category`。
- **资料型**（学习资料）：按课程查档案、下载 PDF，与时间无关。字段 `discipline` + `course` + `material_type`。

`material_type` 合法枚举两类：学术资料 `Notes` / `Exams` / `Homework`（`post.html` 有专属文案），非学术标签 `课程测评` / `经验之谈` / `错题本` / `写作` / `词汇` / `口语`。新增取值要同步改 `scripts/audit/material_type_enum.py` 的白名单。

资料型也要写 `main_category: "学习资料"`，但那只为首页统一计数服务，**分组靠 `discipline`**。

### 顺序控制

`_config.yml` 里的 `discipline_order`（学科分组顺序，思政恒在末尾）和 `study_order`（课程顺序）。别用 `discipline: 其他` 兜底。

### 命名规则

课程名用中文；**同一门课在多校上过才加后缀**消歧（`（北大）`/`（PSU）`），单校课程不加。`course` 与 `sub_category` 保持一致。

### 辅助数据

- `_data/course_aliases.yml` — 课程搜索别名，让英文/拼音/错别字也能搜到。key 必须和 `course` 完全一致。
- `_data/search_synonyms.yml` — 搜索同义词。

### 发布流程

用 skill，别手写 front-matter：

| 场景 | 命令 |
|---|---|
| 新文章 | `/new-post` |
| 菜谱 | `/recipe`（有专属 layout 和强制 schema，不能用 new-post 代替） |
| 补搜索关键词 | `/search-keywords`（发布前必做） |
| 图片配文 | `/image-caption`（一律用 `<p class="img-caption">`） |
| 统一引号 | `/fix-quotes` |
| 导出公众号 | `/wechat-export` |

### 三个内容坑

1. **Jekyll 未来日期静默 404**：`date` 大于今天的文章不发布也不报错。新文的 `date` 必须严格抄当天日期。
2. **PDF-only 资料不用手写正文**：`post.html` 会按 `course` + `material_type` 自动生成说明句。巡检时**不要**把「正文 0 行 + 无 summary」标成缺陷。
3. **课程笔记不需要拆章节**：中文站不必补「缺主笔记.md」或把 PDF 拆成章节页，巡检别当问题。

---

## 5. 百宝箱

49 个目录工具，单一数据源是 `_data/toolbox.yml`。字段：`id` / `name` / `icon` / `tagline` / `url` / `category`（游戏/工作/生活）/ `subcategory` / `status`（live|coming）。**YAML 里的顺序就是页面渲染顺序。** `game_versions.json` 还包含兼容入口、附属页和弹珠机子桌，不能拿它的 URL 数当目录工具数。

游戏子类：棋类对战、牌类游戏、单人小游戏、派对多人。

### 共享外壳

`_includes/toolbox/` 下的 games-shell 提供排行榜、评论、续局、二维码等公共能力。**新工具接外壳，别复制粘贴。**（例外：合成大西瓜 suika 自成一派。）

### 可见性系统

`_data/visibility.json` 是板块与工具下架的单一数据源，由 `/admin/#content` 面板读写（后端提交回 main）。构建期对访客隐藏、对管理员变灰可预览。当前下架：`blackjack`、`solitaire`。

`sections` 数组填 `main_category` 值或 `百宝箱`；`tools` 数组填 `toolbox.yml` 的 `id`。

### 游戏 AI

据记录：掼蛋和斗地主都白嫖了开源强化学习权重（DanZero / DouZero）转成纯 JS 推理，权重与训练产物在 `scripts/sim-*.js` 和 `sim-*-weights-final.json`。三档难度是**三套不同权重向量**，不是同模型加噪。完全信息棋类（象棋等）靠搜索深度调难度，不用权重训练。

调掼蛋 AI 用内置调试台（暗号 `dbug`：AI 透视镜 + 固定种子复现 + 局面注入），别重造轮子。

### 验证工具页的正确姿势

**不要起无头 Chrome**——会卡死用户正在用的浏览器。据记录，替代方案是 `@napi-rs/canvas` 离屏渲染 PNG + `vm` mock DOM 跑 IIFE，或 jsdom 无头自测。已下架无法点验的工具尤其要用这招。

---

## 6. 后端与账号体系

> 本章多为据记录转述，动手前请读 `backends/` 源码核实。

### 两个 fly 生产 app + 一个未部署 MCP 源码仓库

| app | 职责 |
|---|---|
| `zircon-urge` | 排行榜、催更、文末表情、站内助手、联机 relay、账号、积分、收藏、admin |
| `zircon-comments` | 评论（Waline） |
| `zircon-mcp` | 本机 / GitHub 有把公开 GET 包成 5 个 MCP tool 的源码；2026-07-20 `flyctl apps list` 未发现同名 app，不能当线上服务 |

源码在仓库 `backends/{urge,comments,mcp}`，**这些是独立 git 仓库的本机工作副本**，被 Jekyll 构建排除。要部署得 `cd` 进去再 `fly deploy`——别去 `~/Desktop/zircon-*` 找老副本。

CORS 是 `Access-Control-Allow-Origin: *`，换域名无需改动。

**部署命令**（据记录，Depot 挂掉时的可用形式）：
```bash
flyctl deploy --depot=false --remote-only --wg
```

### 数据存储

urge 主数据使用 Upstash Redis；评论与页面阅读量使用 Waline PostgreSQL。**已知陷阱**：Upstash SDK 的 `get` 会自动反序列化，`JSON.parse` 前必须先 `typeof raw === 'string'` 守卫，否则全线 500。另外它把字符串 `'0'` 反序列化成数字，需要 `String()` 兜回来。这两个坑都实际炸过。

### 账号体系

- 登录：邮件验证码为 8 位随机数，摘要存 Redis、10 分钟到期、单次使用；按 IP 与邮箱限制发送和猜测。也可用已验签的 Google ID token 登录，并按 Google `sub` 绑定。本站密码入口已全部关闭，历史密码哈希已清除。SiteAuth 使用无状态 JWT，支持多设备。
- 个人中心 `/account/`：资料编辑、邮箱/Google 登录状态、隐私档（导出/注销）、社交档（公开主页 `/u/`）。2026-07-14 做过一次大重设计（桌面宽版三区 hero + 手机分段）。
- 积分等级：数字十级，签到/评论/收藏加分。评论加分靠 Waline 的 `postSave` 用共享密钥 `POINTS_SECRET` 回调 urge。
- 收藏夹：多收藏夹模型，一篇可属多夹（`meta.a` 数组）。
- 评论：Waline，**靠 email 关联账号**。站主评论的「作者」徽章靠 `_config.yml` 的 `comment_author_id`。

### 管理后台

`/admin/`，仅 Google 登录 + `ADMIN_EMAILS` 白名单 + 独立 adm JWT。功能：鉴权、看板、文章就地编辑（写回 GitHub）、可见性面板。真隐藏的内容正文搬到后端，不留在公开仓库。

### 已退役的付费墙

旧付费墙、兑换码和支付路由已于 **2026-07-20** 退役。`_paid/` 仅保留可能存在的历史私有源并继续被 gitignore/Jekyll exclude；不得把其中正文加入公开仓库。

---

## 7. PWA 与离线

整站早已是 PWA（`manifest.json` + `sw.js`）。据记录，2026-07 换成**双层缓存**：

- **离线书架**：用户显式保存的内容，cache-first，秒开。
- **有界浏览缓存**：临时的，自动淘汰。

版本号策略：游戏用代码 hash（`_data/game_versions.json`），文章用 `updated | date`。`offline-versions.json` 是产出物，由 `scripts/offline/` 下的脚本生成。用户侧内容库在 `/account/offline/`。

单个工具能装成独立 APP：靠工具页 front-matter 覆盖 manifest 字段，一份代码自动同步。

**SW 没法本地正常测**，靠 `sw-selftest.js`。本地开发有 localhost 守卫，别删。

已知遗留：整栏/分组批量入库按钮还没做。

---

## 8. 资料库与 LaTeX 生产线

`files/` 157 MB / 141 个 PDF，按课程分目录。约定：有源码的课程放 `files/<course>/source/`。

### 自著讲义（据记录）

| 项目 | 状态 |
|---|---|
| 经济数学工具箱 | 8 Part / 42 章 / 447 页，已上线 |
| 思政（马原 + 毛概） | 已上线，PDF-only |
| 本科旧笔记 LaTeX 化 | 进行中，必读 `docs/undergrad-notes-latexify-playbook.md` |
| 家教讲义 | 已上线 `/tutoring` |
| 计量博资考讲义 | 进行中，2026-08-20 考试 |

playbook 在 `docs/`。**LaTeX 坑**：`\mat` 会吞大写希腊字母，要用 `\vc`。中文讲义图内标注用楷体 `\kaishu`（与「中文网页不用斜体」不冲突，PDF 字体是内嵌的）。

**铁律：原料没上线前绝不删。**

### 瘦身

本机有 `pdfslim` / `imgslim` 命令和访达右键菜单。注意 `monetary-econ-2023` 文件损坏，**不要压它**。

---

## 9. 搜索、SEO 与发现

- `search.json` 构建期生成全站索引，配 `search_synonyms.yml` + `course_aliases.yml`。文章 front-matter 的 `keywords:` 让读者凭同义词/英文/错别字也搜得到。
- 站内助手（锆石小助手，右下角气泡）：`assistant-index.json` + `assistant-fulltext.json` 检索 + DeepSeek 混合问答，前后端都已上线。
- SEO：`jekyll-seo-tag` + `jekyll-sitemap` + `jekyll-feed`。分享卡片默认图 `default_share_image`。
- 站务公告独立成 `/board/`；老 `/essays/welcome-home` 靠 `jekyll-redirect-from` 保命。
- 微信分享卡片和小程序方向**已封档**（卡在备案费与零变现）。

---

## 10. 日常维护

### 自动化调度

| 任务 | 频率 | 位置 |
|---|---|---|
| 每日巡检 | 远程 routine 08:00 + 本机 LaunchAgent 08:30 让位 | `scripts/daily_review.sh`，结果进 `DAILY_REVIEW.md` |
| 邮件总结 | 每天 9am / 9pm | `scripts/email_summary*`，IMAP 读信 + 总结 + 建草稿 + SMTP |
| audit 巡检 | 当前 14 个每天、3 个周一、1 个每月 1 日 | `scripts/audit/` |
| 机票监控 | 按需 | `scripts/flight_watch*` |

LaunchAgent plist 模板在 `scripts/io.github.zirconeey.*.plist.template`（标识符还带旧名 `zirconeey`，是本地标识符，不影响线上，没必要改）。

### 巡检期间禁止 agent 自发提交

靠 `.claude/AUDIT_MODE` 文件触发 `scripts/hooks/pre_bash_audit_no_commit.sh`（配在 `settings.json` 的 PreToolUse）。巡查时别绕过它。

### 常见故障排查

| 症状 | 查什么 |
|---|---|
| 改了 `_layouts` 后线上构建失败 | GitHub Pages build status。本地 Jekyll 4 与 Pages 3.10 有差异，`where_exp` 不支持复合表达式 |
| 新文章不显示也不报错 | `date` 是不是写成了未来日期 |
| 后端全线 500 | Upstash `get` 自动 parse 陷阱，检查 `typeof` 守卫 |
| SW 缓存不更新 | 版本号有没有变，看 `offline-versions.json` |
| 文内 JS 挂了 | `_notes` 里嵌 script 禁写 `{{` / `{%`，JS 用单引号 + 反引号模板避开 `fix_quotes` |

### 改动前必查

1. `git status` 看清工作区有什么不是你的。
2. 改工具 → 是否要同步 `toolbox.yml` / `visibility.json` / `game_versions.json`。
3. 改后端 → 是独立 git 仓库，要 `cd` 进去单独部署。
4. 发文章 → 跑 `/search-keywords`。

---

## 11. 现状体检

### 稳的

内容层、模板层、部署流程、工具箱主体、后端核心接口。这些跑了几个月，有巡检覆盖。

### 欠债的

| 债 | 说明 |
|---|---|
| **`.git` 275 MB** | 需要 force-push 改写历史才能瘦，一直没做。clone 体验差。 |
| **统计口径分裂** | Cloudflare 已全站覆盖，GA 只在两个首页。以 Cloudflare 为主；待确认后台 API token 与历史数据完整性。 |
| **旧文档过时** | `docs/MAINTENANCE.md`（2026-05）里说「英文站 `en/` 靠 CI sync 到独立仓库」等描述已不符现状；`docs/ARCHITECTURE_REVIEW.md` 是 5 月的状态快照。本手册写作时未逐条修订它们，**优先信本手册**。 |
| **根目录堆积** | `SPOTCHECK_100_REPORT.md`（101 KB）、`SPOTCHECK_100_AGENT_REPORTS.md`（113 KB）、`TOOLBOX_AUDIT_REPORT.md`、`DAILY_REVIEW.md`（251 KB）挤在仓库根。已排除出构建，但该归档进 `docs/`。 |
| **未提交工作区** | 编写时有 11 项未跟踪文件（`SECURITY_GOVERNANCE.md`、几门课的 `source/`、两篇新笔记）。**归属未确认**，别顺手提交。 |
| **半成品目录** | `tmp/`、`tools/`、`_flight-staging/` 用途待确认，可能是死代码。 |

### 脆的（单点故障）

这是接手时最该紧张的部分：

1. **密钥全在原作者手上**：fly secrets、Upstash、Google OAuth、R2、域名。任何一个交接不到位，对应功能就永久失效且无法恢复。
2. **本机依赖**：邮件总结、机票监控、部分巡检跑在原作者 Mac 的 LaunchAgent 上，换人接手要重装。
3. **动态数据恢复链路已完整跑通**。2026-07-20 每周工作流首次成功覆盖 Upstash、Waline PostgreSQL 与 R2，并完成密文上传回读；同日又把三源全部恢复到临时环境并核对后销毁临时资源。此后按季度重演，避免工具或服务漂移。
4. **内容备份**只有 GitHub 一处（待确认是否有异地副本）。

### 待确认项（别当事实用）

- `published: false` 实测为 **0 篇**，但项目记录说性科普专栏「全部 published:false 待批量上线」。要么稿子还没落盘，要么记录已过时。
- fly.io / R2 / 域名的实际月成本与付费账号。
- Upstash 是否有备份/快照。
- 实际用户数、评论数、日活。

---

## 12. 未来方向

### A 档 · 现在就该做

| 事 | 为什么 | 工作量 |
|---|---|---|
| **确认 Cloudflare 统计后台可读** | beacon 已全站覆盖；需核实 API token、账号权限和历史数据 | 30 分钟 |
| **保持季度三源恢复演练** | 2026-07-20 首次完整演练通过；下次最迟 2026-10-20 | 每季度半天 |
| **补齐服务 / 密钥清单的账号归属** | GitHub 已迁移到所有者账号；Google 与 Cloudflare 2FA / 恢复码、域名续费已确认；Fly、Upstash、Neon、DeepSeek 及第二管理员仍待核对 | 1 小时 |
| **根目录报告归档进 `docs/`** | 卫生 | 10 分钟 |

### B 档 · 中期结构性

- `.git` 瘦身（需 force-push，要挑没人并发的时候做）。
- 把 `docs/MAINTENANCE.md`、`ARCHITECTURE_REVIEW.md` 与本手册合并，只留一份权威文档。
- `/notes/` 页随内容增长的 Liquid 循环性能（当前规模够用，翻倍后要看）。
- 清理 `tmp/` / `tools/` / `_flight-staging/`。

### C 档 · 内容与增长

- 未完成的讲义线：本科旧笔记 LaTeX 化、accounting（用户明确暂缓，别主动启动）、r-系列笔记转 markdown。
- `status: coming` 的工具。
- 播客流水线卡在 R2 配置与参考音录制，是用户侧的事。

### D 档 · 明确不要动

**接手人最容易好心办坏事的地方。以下都是刻意设计，不是 bug：**

| 项 | 别动的理由 |
|---|---|
| 字体栈 Cormorant + Noto Serif SC | 站点视觉标志，改前必须先问 |
| 两套分类体系不统一 | 博客型按时间读、资料型按课程查，本来就是两种东西 |
| 中文不用斜体 | 排版规范，备注用正体+小字+灰色 |
| PDF-only 文章正文为空 | `post.html` 有自动导语兜底，不是缺内容 |
| 课程笔记不拆章节 | 刻意，别补「缺主笔记.md」 |
| 加权抽签器的「体感错觉」 | 用户觉得不随机是心理现象，算法是对的 |
| 飞行棋骰子换色 | 方案 B，刻意 |
| 象棋对坐转 180° | 刻意 |
| 八字排盘的娱乐免责声明 | 刻意 |
| Cheat sheet 不转 LaTeX | 源是 Word 且复用率低 |
| 本地 `zirconeey` 命名残留 | 本地标识符，不影响线上 |

**通用原则**：看到「这里怎么这么怪」的地方，先翻 `CLAUDE.md`、`docs/` 和项目记忆，八成写着为什么。改之前先问。

---

## 附：文档索引

| 文档 | 内容 |
|---|---|
| `CLAUDE.md` | Git 提交边界与分支模型（**强制遵守**） |
| `docs/SITE_HANDBOOK.md` | 本文，接手总纲 |
| `docs/MAINTENANCE.md` | 2026-05 维护说明，部分过时 |
| `docs/ARCHITECTURE_REVIEW.md` | 2026-05 架构审查与失败复盘 |
| `docs/*-playbook.md` | 各专项生产线操作手册 |
| `docs/SECURITY_AND_RECOVERY.md` | 当前安全与恢复基线 |
| `docs/OPERATIONS_INVENTORY.md` | 服务、密钥名称、账号与恢复位置清单 |
| `SECURITY_GOVERNANCE.md` | 根目录未跟踪旧草稿，不是当前权威文档，勿顺手提交 |
| `DAILY_REVIEW.md` | 每日巡检流水账 |
