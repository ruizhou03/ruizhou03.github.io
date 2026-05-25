## 2026-05-25

工作区有未提交改动（`scripts/daily_review.sh`），未做巡检。按规则不碰未提交内容，本次只更新 DAILY_REVIEW 并退出，等下次工作区干净时再跑完整巡检。

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
