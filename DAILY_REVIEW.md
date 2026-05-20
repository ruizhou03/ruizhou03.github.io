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
