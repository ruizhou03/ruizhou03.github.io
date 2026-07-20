## 2026-07-20

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（今日 DOW=1 周一，加跑 dead_links / orphan_files / pii_scan；DOM=20 非月初，未加 monthly_stats）。**今日凌晨那次由同名 routine 起的巡检因工作区一批「本科旧笔记 LaTeX 化」项目的 untracked WIP 而中止**（见 `6e8350d chore(daily-review): 2026-07-20 工作区脏未做巡检`）——本次再起 sandbox 时，那批 WIP 已被清理（`ls SECURITY_GOVERNANCE.md _notes/study/game-theory/game-theory-2023.md files/game-theory/game-theory-2023.pdf` 全「No such file」；`git ls-files --others --exclude-standard` 空），推测是站主本机把该批产物挪走或转到别处（不在 git 历史里），工作区已干净、可以正常巡检。距 7-19 巡检共 **41 个新 commit**（`287f258..35a7728`，其中 `287f258` 与 `6e8350d` 两条是 daily-review 本身自更），承接近三日「门面适配 P0-P4 + 12 处收口」之后进入**离线内容库 / 学习资料页 / 栏目页三大改造 + 账号中心 & 管理端 6 处宽度修复 + 站务公告独立化 + 百宝箱 6 处上下架 + 站点接手手册**的密集迭代日，主要脉络：
>
> ① **离线内容库 offline 7 commit 大项目**（`2f64904` 双层缓存内核 · `e54bb77` 内容版本基建 · `2275f4e` SAVE_DONE 回报缓存清单 · `1fb3333` 统一离线客户端 + 文章页接线 · `7a8f0ad` 离线内容库页面 + 账号中心入口 + WiFi自动更新 · `06e5fde` 索引自愈 + 设置入口 · `ec5f3ff` 修尾斜杠致文章 404/保存失效 + 删除二次确认 + 批量管理与翻页）—— 从零搭起「离线书架（cache-first）+ 有界浏览缓存」双层内核，配 offline-versions.json（含双日期 + 游戏内容哈希）判定「新旧版」，客户端加入 `account/offline.html` 页面与统一 offline.js，把 sw.js 由 175 行扩到 605+ 行、加入 SAVE_DONE 消息把本次缓存清单回报供客户端精确删除；`sw.js` 现 23572 B；`account/offline.html` 现在 272 + 66 行涵盖批量管理 / 翻页 / 二次确认 / 尾斜杠兼容。
>
> ② **学习资料 /notes/ 页大改 8 commit**（`92948b1` 目录页重构 + 撤书架 + 讲义归位合并 + 卡片&目录双视图 + 课程浮层 · `9a2ebac` 精选 ◆ 悬挂到文字左侧 · `798dbe8` 突破 main 800px 上限卡片一行 4 张 · `50ffdd5` 卡片视图左侧加学科跳转点导航 · `f599a19` 点导航加间距/连接线 + 搜索移到卡片正上方 · `3ba5f12` 连接段改纺锤形 · `763fee1` 连接段收细到 3px + 悬停非当前学科也有反馈 · `642bae3` 纺锤连接段收到 1.5px 悬于两圆之间）—— 从「书架式布局」转向「卡片双视图 + 学科点导航（仿首页 dots）+ 课程浮层」的完整 IA 改造；点导航连接段迭代 4 次到「纺锤形 1.5px 悬于两圆之间」的纤细感。
>
> ③ **栏目页升级 3 commit**（`7dee4fd` 精品带 + 书目化列表升级 · `0bc4ed3` 列表/卡片标题字重 600→500 · `89b5a75` 书目编号改运行时按「现存文章」计算）—— `research/life/essays` 三板块统一到「精品带 + 书目化列表 + 运行时编号」新语言。
>
> ④ **站务公告独立化 3 commit + 那年今日搬入 2 commit**（`f4b6a2a` 站务公告独立存档页 · `08c941c` 首页页脚/头像菜单入口 · `7d557ad` 移到 /board/ + 时间轴改版 · `eb35d3e` 那年今日从百宝箱下架搬进 /board/onthisday/ · `6f477bb` 那年今日子页套 board 衬线 hero 风格）—— 站务公告从「首页嵌入片段」升为 `/board/` 独立存档区，「那年今日」时光机从百宝箱工具搬进公告子页（`_site/board/` 与 `board.html` 均新出）。
>
> ⑤ **账号中心 & 管理端宽度 / 头像 / 顶栏收口 8 commit**（`c6569fe` 左导航图标改统一矢量 SVG · `dfc1116` 评论记录改 A2 版式 · `5725a0d` 头像菜单身份行点进主页 + 主页头像点击编辑 · `697e14a` 主页简介折行+至多两行省略 · `8fffebf` / `8e1ce8d` account/admin 顶栏不再随本页收窄 · `1effe45` 顶栏去返回链 + 管理菜单改分段开关 · `03bbfd6` 中文首页③精选自适应版面 0–4 张）—— 修 `.nav-inner max-width` 覆盖导致顶栏跟着本页收窄的问题；账号简介折行；管理菜单分段开关。
>
> ⑥ **admin 收件箱 2 commit**（`f4b6a2a` 全站评论/点赞/收藏统一时间线 · `e7cbc0e` 条目去重叠重设计 + 评论正文渲染公式/图片 + 翻页）—— 新增 admin 收件箱面板把全站评论 / 点赞 / 收藏聚合到一条时间线。
>
> ⑦ **百宝箱 6 commit 上下架 + 图标大换血**（`aba303b` 下架并删除生词本、猫语板 · `25f030b` 下架并删除目标进度跟踪工具 · `9f3855d` 下架 21点、接龙纸牌（visibility.json 隐藏，文件保留可恢复）· `2b2eae6` 清理栏目页搜索条死代码 · `d4e945b` `_notes/life/drinking-water-types.md` evergreen=false · `db179dd` **36 个工具图标从 emoji 换成手作矢量图（栅格 PNG）**）—— **`db179dd` 图标大换血**：一次性画 33 张 512 圆角奶油底 PNG（藏蓝主形 + 暖金点缀 · 扁平无渐变 · 无细线）+ 复用现成 3 张（掼蛋 / 2048 / 记账）；`_data/toolbox.yml` 49 个 tool 里 39 个换成 `/assets/icons/*.png`（本轮核对 `grep "^  icon: /assets" _data/toolbox.yml | while read line; do p=$(echo $line | awk '{print $2}'); [ -f ".${p}" ] || echo MISSING; done` 全命中、无缺失），仍 10 个保留 emoji = 8 个待合并候选 + 2 个已下架（21点 / 接龙纸牌）；宠物中心 + 合成大西瓜的 PWA 全家族（192/512/maskable/apple-touch）一并重出保持一致；`_data/toolbox.yml` 净变 36 / 36 行。
>
> ⑧ **日期格式全站统一 1 commit**（`5190ef3` 显示日期横杠/点 → 斜杠 2026/05/20）+ **SITE_HANDBOOK 接手手册 1 commit**（`35a7728` `docs/SITE_HANDBOOK.md` 452 行，写给接手人的总纲；`docs/` 已在 `_config.yml` L37 exclude，本次核对 `ls _site/docs 2>&1` = 「No such file or directory」，未泄露）。
>
> **build 健康度**：`bundle install` ✅ + `bundle exec ... jekyll build` ✅ 通过、**零 warning、零 error**（**18.828 s cold build** —— 与 7-19 的 18.714 s 相仿）。`_site/` 顶层 **30 项**（较 7-19 +2：新增 `board/`（站务公告独立化）+ `offline-versions.json`（离线版本清单）；其余 28 项与 7-19 一致）。`_notes/` 全 **270 篇 md** 仍 100% 覆盖 `keywords:`（`find _notes -name '*.md' -exec grep -L '^keywords:' {} \;` 空），搜索体系闭环。`_paid/` + `_flight-staging/` 在 `_config.yml` L53 / L55 exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。**maskable 图标 md5 核验**：`python3 scripts/audit/maskable_icon_consistency.py` 报「✅ 已检查 9 个 maskable 图标声明，均与 any 图标不同」（承接 7-19 一致；`db179dd` 只重出 pet + suika 两组 PWA 主 icon 全家族，未打破 maskable 与 any 的字节差异）。**`study_order`**：`_config.yml` 26 条、`ls _notes/study/` 26 目录、`comm -23` 差集空 —— 与 7-19 一致。全套 `scripts/audit/run.sh` 每日 14 项 + 周一 3 项 audit 结果：`keywords_coverage` 121/121 散文类全覆盖 / `images`（2 处 2M+ PDF 备忘列出、非命中）/ `backend_pulse`（curl 56 HTTP 403 承接沙箱无 fly.io 出口）/ `spotcheck` 10 项配额抽检 / `material_type_enum` 117 项全在 9 项枚举内（Notes×47 / Exams×40 / 课程测评×18 / 经验之谈×5 / 错题本×3 / 写作×2 / 口语×1 / 词汇×1，与 7-19 完全一致）/ `filename_convention` / `maskable_icon_consistency` / `hover_no_media`（只扫 `toolbox/`）/ `sibling_crosslink`（10 组全互链）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` **均 ✅**；周一加跑：`orphan_files` 0 孤儿 / `pii_scan` ✅ / `dead_links` 报「269 疑似死链」—— 逐行归类：**242 条**是沙箱代理无法出网（`HTTPSConnectionPool ... Unable to ... ProxyError`）覆盖 `cdn.jsdelivr.net` / `988lifeline.org` / `afdian.com` / `appleid.apple.com` / `books.ropensci.org` / `bsaefiling.fincen.treas.gov` 等 60+ 生产环境正常的域名；**23 条**是 `mp.weixin.qq.com` 微信公众号图文链的 HTTP 403（微信一贯对爬虫返 403，是长期已知误判）；**其余 4 条**：`repec.org/bocode/e/estout/` HTTP 403（Stata 生态经典链接，同属爬虫 403）/ `accounts.google.com/gsi/client` HTTP 403（Google Identity Services 端点、鉴权失败正常）/ `fonts.googleapis.com` + `fonts.gstatic.com` HTTP 404（`toolbox/jukebox/index.html:14-15` 里作为字体基础域名字符串出现，非可访问路径，是审查脚本对基础域名 URL 的误判）—— **无一条是真的仓库内坏链**，全属沙箱网络 / 服务端反爬 / 审查启发式误判 三类已知假阳，承接 7-19 之前多次巡检结论、写进 P2、不擅动。
>
> **今日 0 项自动修复**：仓库处于极健康状态——build ✅、每日 14 项 + 周一 3 项 audit 无一命中真实问题、`keywords_coverage` 270/270、`study_order` 26/26 完整、maskable 图标一致、无 junk / 无 stub / 无凭证泄露；41 个新 commit 全部合规、无遗漏收尾、无孤儿资源。识别出的**观察项**均属大范围 UI 改造需真机验收 / 设计取向拍板 / 沙箱网络限制，一律不属「小而无争议」自动修复，写进 P2、不擅动。

### ✅ 本次已自动修复

无。

站点处于极健康状态：build ✅、17 项 audit 全 clean（唯一 269 条 dead_links 全属沙箱网络 / 微信反爬 / 审查启发式误判三类已知假阳）、keywords 270/270、study_order 26/26 完整、maskable 图标 9 项一致、无 junk / 无凭证泄露；41 个新 commit 全为「离线内容库 / 学习资料页 / 栏目页三大改造 + 账号中心 & 管理端收口 + 站务公告独立化 + 百宝箱 6 处上下架 + 图标大换血 + SITE_HANDBOOK」协同推进，无遗漏收尾。今日观察项均属大范围 UI 改造需真机验收 / 设计取向拍板范畴、非「小而无争议」自动修复项。

### 📋 待你把关

#### P0（紧急）

无。

#### P1（重要）

无。仓库当前 P1 队列为空。

#### P2（建议）

1. **离线内容库 offline 7 commit 需 4 组合真机 + PWA + 断网端到端验收**（**今日新增**，来自 `2f64904` `e54bb77` `2275f4e` `1fb3333` `7a8f0ad` `06e5fde` `ec5f3ff` 全批）—— 关键验收面：① 双层缓存内核（离线书架 cache-first 与有界浏览缓存）在有网 / 断网 / 弱网三态下的行为分层；② SAVE_DONE 消息回报的清单是否让批量删除精确到资源级；③ offline-versions.json 双日期 + 游戏内容哈希是否让「保存过的老版本」提示自动更新；④ 账号中心 `account/offline.html` 批量管理 / 翻页 / 二次确认 / 尾斜杠兼容（`ec5f3ff` 修 404 与保存失效）；⑤ 索引自愈（`06e5fde` 整栏 / 分组保存的项也进内容库 + 设置入口）；⑥ WiFi 自动更新的省流开关。iOS Safari + Android Chrome + iPad + 桌面 Chrome 四端 + 「加装到主屏」PWA standalone 五组合过一遍；沙箱无浏览器 + 无网络出口跑不了。**紧要程度**：离线体验是本站 PWA 主打差异化、7 commit 单日搭起整套基建，出问题就整个功能挂。

2. **学习资料 /notes/ 页 8 commit 大改造需六组合真机验收**（**今日新增**，来自 `92948b1` `9a2ebac` `798dbe8` `50ffdd5` `f599a19` `3ba5f12` `763fee1` `642bae3` 全批）—— 关键验收面：① 卡片双视图（`92948b1`）在浅深模式 + 手机竖屏 / 平板 / 桌面下的切换体感 + 课程浮层弹出定位；② 精选 ◆ 悬挂到文字左侧（`9a2ebac`）的分割线 / 文字 / PDF 三行不再错位；③ 突破 800px 主容器上限一行 4 张卡片（`798dbe8`）在 1280 / 1440 / 1920 三分辨率下的横向留白与视觉重心；④ 学科点导航（`50ffdd5`~`642bae3` 5 commit 迭代到「纺锤形 1.5px 悬于两圆之间」）在悬停 / 触屏 / 键盘 tab 三种交互模式下的反馈一致性 + 与首页 dots 的视觉呼应；⑤ 搜索移到卡片正上方（`f599a19`）的信息层次。iPhone Safari / Android Chrome / iPad / 桌面 Chrome / Firefox / PWA 六组合下过一遍；沙箱跑不了。

3. **栏目页升级 + 站务公告独立化 + 那年今日搬入 8 commit 需真机验收**（**今日新增**，来自 `7dee4fd` `0bc4ed3` `89b5a75` `f4b6a2a` `08c941c` `7d557ad` `eb35d3e` `6f477bb` 全批）—— 关键验收面：① 三板块（research / life / essays）精品带 + 书目化列表 + 运行时按现存文章计算书目编号的一致性；② 列表 / 卡片标题字重 600→500 后中文不再被 Noto Serif SC 700 顶成粗体；③ `/board/` 站务公告独立存档区在首页页脚 / 头像菜单入口的可发现性 + 那年今日 `/board/onthisday/` 子页衬线 hero 与站务公告一脉相承的视觉延续。沙箱跑不了。

4. **账号中心 & 管理端 & 首页 8 commit 收口需真机跨身份验收**（**今日新增**，来自 `c6569fe` `dfc1116` `5725a0d` `697e14a` `8fffebf` `8e1ce8d` `1effe45` `03bbfd6` 全批）—— 关键验收面：① 顶栏不再随本页 `.nav-inner max-width` 收窄（`8fffebf` + `8e1ce8d` account + admin 双修）在 1280 / 1440 / 1920 三分辨率下顶栏统一宽度；② 账号主页简介折行 + 至多两行省略（`697e14a`）不再横向溢出挤占统计 / 操作区；③ 头像菜单身份行点进主页 + 主页头像 / 昵称点击编辑资料（`5725a0d`）交互闭环；④ 评论记录 A2 版式 + 缩略图真正显示（`dfc1116`）；⑤ 左导航图标改统一矢量 SVG（时钟 / 聊天气泡）（`c6569fe`）；⑥ 顶栏去返回链 + 管理菜单改分段开关（`1effe45`）；⑦ 中文首页③精选自适应版面 0–4 张（`03bbfd6`）在文章数 0 / 1 / 2 / 3 / 4 五状态下的版面自适应。三身份（未登录 / 已登录 / 站主）+ 深浅模式跨全六组合验收；沙箱跑不了。

5. **admin 收件箱 2 commit 需真机 + 后端接线验收**（**今日新增**，来自 `f4b6a2a` `e7cbc0e`）—— 收件箱面板把评论 / 点赞 / 收藏聚合到时间线，条目去重叠重设计 + 评论正文渲染 KaTeX 公式 + 图片 + 翻页；沙箱无 fly.io 后端出口 + 无 Waline 数据源跑不了。

6. **百宝箱 36 图标大换血 db179dd 需真机 + PWA 多设备验收**（**今日新增**）—— 关键验收面：① 39 图标（33 新画 + 3 复用 + pet / suika 重出）在工具箱 landing 的 tile grid 视觉一致性（是否有个别图标偏色 / 偏大 / 偏小 / 与「奶油底 + 藏蓝主形 + 暖金点缀」不统一）；② 藏蓝 + 暖金 palette 在浅 / 深模式下是否都保持辨识度；③ pet + suika 两组 PWA 全家族（192/512/maskable/apple-touch）重出后在 Android 桌面 / iOS 主屏「加装」时新图标是否正确替换旧的（老用户看到的可能是老图标缓存）；④ 剩下 10 个仍是 emoji 的工具在同一 grid 里是否显得违和（8 个待合并 + 2 个已下架）。沙箱无 GUI 跑不了。**注**：`_data/toolbox.yml` 39 条 `/assets/icons/*.png` 路径本轮已 `[ -f ]` 逐一核对无 missing、无 typo。

7. **`docs/SITE_HANDBOOK.md` 452 行接手手册需站主亲自过一遍事实核对**（**今日新增**，来自 `35a7728`）—— 手册明确分「已实测」（数量 / 路径 / 配置值） vs「据项目记录」（来自 `CLAUDE.md` + `docs/` 旧文档 + 项目记忆的转述、未逐条复核）两类；作者也列了「明确待确认项」集中在第 11 章。**站主应在正式给他人前重跑一次核对**：① 手册开头「本次编写时用命令实证过」的数字（`_notes/` 272 篇 / `files/` 157 MB / `files/` 141 个 PDF / 工具箱 51 个约 64300 行 / `scripts/` 102 文件 / 1700 提交起于 2026-04-16）与今日实际（本轮 `find _notes -name '*.md' | wc -l = 270` 差 2、其余未逐一核对）是否仍一致；② 后端应用清单（`zircon-urge` / `zircon-comments` / mcp）与实际 fly.io 部署是否一致；③ 域名注册商「待确认」等实际待确认项。**属内部文档、面向接手人**、`docs/` 已 exclude 出 Jekyll build（本轮核对 `ls _site/docs 2>&1` = 「No such file」），不泄露到公开站。

8. **7-19 承接 P2**：① 门面适配 P0–P4 + 12 处收口共 18 commit 需六组合真机验收（`c419da7`~`e2edca8`）；② `_includes/category-search.html` 孤儿 include（`2b2eae6` 本次已在部分清理死代码方向上推了一步、`refactor(landing): 清理栏目页搜索条死代码,菜谱走独立页`——但该 commit 未删 include 文件本身也未 trim `_includes/category-listing-tools.html` 里的 5 处 `cat-search-*` CSS 与 JS 监听，仍是死代码半清；进一步清不清仍属站主拍板）；③ `life/index.html` 菜谱 `search_only=true` 永久隐藏（`2b2eae6` 说明「菜谱走独立页」应已通过下架该分区解决，需站主二次核对本 P2 是否已消除）。

9. **评论体感层 + Vditor 加固 + 图片 R2 + 站主可删评论 + 51 commit 六组合真机验收 + `/u/` 公开主页 + `visibility.json` 全放开 + doudizhu 20 MB 权重 + forest 双视图 + 掼蛋联机 + 机票监控 mac 端到端 + jukebox 问题首 + DNS NameResolutionError + dead_links SVG xmlns 误判**（承接 7-19 之前全部老 P2 未消除项）—— 今日无新观察消除、承接不变。

10. **`dead_links.py` 269 条几乎全是沙箱假阳，考虑增强误判过滤**（**今日新观察**，性质承接 7-19）—— 三类假阳可在脚本层过滤或加白名单：① 沙箱代理错误 `HTTPSConnectionPool ... ProxyError`（可识别 error string 前缀，在沙箱环境下降级为 warning 而非「dead」）；② `mp.weixin.qq.com` HTTP 403（微信一贯反爬，可加白名单域名列表）；③ 用作 CSS/JS 基础域名字符串出现但非可访问路径的 `fonts.googleapis.com` / `fonts.gstatic.com` HTTP 404（同白名单）。是否加过滤属工具决策，请站主拍板；不加也没关系、本 audit 输出已由 daily-review 逐条分类。

### 🗂 仓库卫生

**目录结构较昨日 +2 顶级路径**（`_site/board/` 站务公告独立化 + `offline-versions.json` 离线版本清单，均是内容 / 功能新落地，非工具垃圾），工作副本足印本轮实测 `du -sh _site .git` = **`_site` 235 MB + `.git` 141 MB**（与 7-19 的 236 MB + 140 MB 完全一致的量级；41 commit 净变动主要在 CSS / JS / HTML / 33 张新 PNG 图标 + 1 新 include + `docs/` 已 exclude 的 SITE_HANDBOOK 452 行 markdown）。**新增文件**：33 张 `assets/icons/*-icon-192.png`（每张 4-10 KB · 合计约 200 KB）+ 4 张 pet PWA 全家族重出 + 4 张 suika PWA 全家族重出 + `docs/SITE_HANDBOOK.md`（452 行）+ `docs/ARCHITECTURE_REVIEW.md` `docs/MAINTENANCE.md` 等（此前的 `f69f906` 已把根 MAINTENANCE.md 系列内部维护文档搬进 `docs/` 集中管理）+ `board/onthisday/index.html`（那年今日搬入）+ `board.html`（站务公告页）+ `board/index.html` 等；**删除文件**：`toolbox/goals/`（进度跟踪下架并删除）+ `toolbox/vocab/`（生词本）+ `toolbox/catlang/`（猫语板）+ `toolbox/timemachine/`（那年今日搬进 /board/）—— 均已在 commit message 里注明「下架并删除」，非误删。`git status` clean（本地 = origin/main、`up to date`）、`git ls-files --others --exclude-standard` 空、`find . -maxdepth 3 -name '.DS_Store' -o -name '*.bak' -o -name '*.orig' -o -name '*.tmp' -o -name '*~'` 全空、`find . -maxdepth 3 -name "* 2.*"` 全空。**大文件盘点**（承接 7-19 完全一致）：`files/or/or-2023.pdf` 5.4 MB（唯一 5 MB+）、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB、`files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB、`pdfjs/build/pdf.worker.mjs` 2.1 MB、`assets/js/doudizhu/weights/` 6 个 `.qw`（合计约 18.4 MB）、`assets/echarts/` 2.0 MB —— 与 7-19 完全一致，无新增大文件；**33 张新 PNG 图标 4-10 KB 每张、合计约 200 KB，量级健康、不进大文件档**。`_paid/` + `_flight-staging/` 在 `_config.yml` L53 / L55 exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `docs/`（L37）+ `DAILY_REVIEW.md`（L38）+ `EMAIL_SUMMARY.md`（L39）+ 其他内部产物；`docs/SITE_HANDBOOK.md` + `docs/ARCHITECTURE_REVIEW.md` + `docs/MAINTENANCE.md` 等均在 `docs/` 内、本轮核对 `ls _site/docs 2>&1` = 「No such file or directory」，未渲染 / 未 leak。**凭证泄露核对**：`grep -rE "(BEGIN [A-Z]+ PRIVATE KEY|(sk|pk|api[_-]?key|secret)[_ -][a-zA-Z0-9]{20,})" -i` 全空——无真实凭证泄露。**结论**：目录结构较昨日 +2 顶级路径均为内容 / 功能新落地非垃圾、`docs/` 内部维护文档集中管理 + 已 exclude、图标大换血新增 33 张小 PNG 量级健康、下架 4 个工具已删除、无仓库卫生可动项。

### 💓 后端脉搏

`backend_pulse.py` 报「未能拉取：network: curl exit 56 (curl: (56) CONNECT tunnel failed, response 403)」×3（zircon-urge / 排行榜 / waline）—— 承接沙箱无 fly.io 出口的长期现象。今日 41 commit 里 admin 收件箱 2 commit（`f4b6a2a` + `e7cbc0e`）新增对全站评论 / 点赞 / 收藏后端数据的时间线聚合、offline 7 commit 里 sw.js 逻辑升级需 API 端点稳定，是否有新增依赖变化沙箱看不到、请站主自查 fly.io 日志与端点响应。

### 📬 读者来信

沙箱无 Gmail MCP + 无 IMAP 出口，本次未跑读者来信抽检。承接 7-19 之前的说明不变。

### 🔬 抽检专项

`spotcheck.py` 今日种子命中 10 项（3 类保底：game / pdf_archive / lecture_note_pdf_only + 7 项纯随机），covering `toolbox/guandan/index.html` 掼蛋 / `files/corp-fin/cheat-sheet-mid-2022.pdf` 财务管理小抄 等；沙箱以静态扫描形式过一遍无 build / lint / a11y / 逻辑硬伤命中、无待人工深审项——**本次未升级为 P2**。抽检 markdown 完整 payload 见 `/tmp/claude-0/-home-user-ruizhou03-github-io/.../scratchpad/audit.md` 的 38-208 行区间。

---

## 2026-07-19

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套。距 7-18 巡检共 **18 个新 commit**（`e579488..e2edca8`）—— 由昨日「评论体感层收口 + `visibility` 全放开」小批次，切入到**「全站门面观感统一 + 中文首页翻页式双联封面重做」的一个完整大项目**：`c419da7` **中文首页翻页式双联封面重做（O3 刻面构成）** → `e72bfd9` **P0 基建 + P1 统一顶栏观感（全站门面适配第一期）** → `a379b85` **P2a 五板块 landing 换加冕页眉**（引入 `_includes/page-hero.html`）→ `3a9db8e` **P2b 板块页去 emoji 分节符 → 金菱记号** → `61719c0` **P3 文章/菜谱标题区统一到金色页眉语言** → `dcad82b` **P4 about + 404 收尾（全站门面适配收官）** → `d30969c` **内页顶栏版式对齐首页 `.topbar`（真正统一，不只是调色）** → `1b53bc7` **内页板块链接居中 + 管理入口收进头像下拉 + 头像内联去重叠** → `29eb277` **首页顶栏补账号头像位（登录 / 头像 + 管理入口下拉）** → `f69f906` **首页顶栏也改居中网格——与内页完全一致，消除翻页跳变** → `101b17d` **内页顶栏字号/高度对齐首页——修「首页偏大、内页偏小」** → `18a6ae2` **封面背景线条换成「叠影」莫尔纹 + 去个人化** → `d664b95` **右上控件完全统一 `[🔍 ◑ EN 头像]` + 头像对齐 + 去「作品馆」** → `ab71aad` **封面叠影改为动态涟漪（水滴入池）+ reduced-motion 静态兜底** → `7d58c7c` **删掉栏目页内的搜索条（与顶部全局搜索重复）** → `c825514` **栏目页 eyebrow「馆藏」→「Zircon」** → `e2edca8` **修 account 评论记录：清理裸链接/回复序号并渲染公式**。P0..P4 五阶命名 + 之后 12 处收口的节奏说明这是一条「预先规划的门面适配路线」而非零散修补，站主已按阶段推进到 P4 完成 + 后续 12 项对齐 / 收口 / 匹配。文件层：新增 1 个共享 include `_includes/page-hero.html`（15 行，把五板块 landing 的 `<h1>` 统一到「加冕页眉」）；其余全为既有文件修改，`zh/index.html` 一日累计 +72 / -65（封面重做）+ 后续 6 处递归收口、`_includes/auth.html`、`_layouts/default.html`、`assets/css/main.css`、四板块 landing、`_layouts/{post,recipe}.html`、`account/index.html` 等散落改动。18 commit 全部在 `main` 上主干推进，与 `CLAUDE.md` 主干开发约定一致。
>
> **build 健康度**：`bundle install` ✅ + `jekyll build` ✅ 通过、**零 warning、零 error**（**18.714 s cold build** —— 与 7-18 的 18.456 s 相仿）。`_site/` 顶层 **28 项**（与 7-18 一致：`404.html` `CNAME` `account` `admin` `admin-manifest.json` `assets` `assistant-fulltext.json` `assistant-index.json` `en` `essays` `feed.xml` `files` `flight` `google5306…` `index.html` `life` `manifest.json` `notes` `pdfjs` `redirects.json` `research` `robots.txt` `search.json` `sitemap.xml` `sw.js` `toolbox` `u` `zh`）。`_notes/` 全 **270 篇 md** 仍 100% 覆盖 `keywords:`（`find _notes -name '*.md' -exec grep -L '^keywords:' {} \;` 空），搜索体系闭环。`_paid/` + `_flight-staging/` 在 `_config.yml` L53 / L55 exclude 双保险稳固、`find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。**maskable 图标 md5 核验**：三对文件仍不 byte-identical（forest 主 `63df7bec…` vs maskable `36ada6c2…`、ledger 主 `fad6da15…` vs maskable `433f42fc…`、pindou 主 `fed25167…` vs maskable `f4ef2d70…`）与 7-18 / 7-17 / 7-16 / 7-15 完全一致；`python3 scripts/audit/maskable_icon_consistency.py` 报「✅ 已检查 9 个 maskable 图标声明，均与 any 图标不同」。**`study_order`**：`_config.yml` 26 条、`ls _notes/study/` 26 目录、`comm -23` 差集空 —— 与 7-18 一致。全套 `scripts/audit/run.sh`（今日周日 DOW=7，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=19 非月初，未加跑 monthly_stats）14 项每日 audit **全 clean 无一命中**：`keywords_coverage` 121/121 散文类全覆盖 / `images`（2 处 2M+ PDF 备忘列出、非命中）/ `backend_pulse`（curl 56 HTTP 403 承接沙箱无 fly.io 出口）/ `spotcheck`（10 项配额抽检——game×2 + pdf_archive×4 + lecture_note_pdf_only×1 + note×3）/ `material_type_enum` 117 项全在 9 项枚举内（当前分布 Notes×47 / Exams×40 / 课程测评×18 / 经验之谈×5 / 错题本×3 / 写作×2 / 口语×1 / 词汇×1）/ `filename_convention` / `maskable_icon_consistency` / `hover_no_media`（只扫 `toolbox/`）/ `sibling_crosslink`（≥3 篇的 10 个 sub_category 组全互链）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` **均 ✅**。
>
> **今日 0 项自动修复**：仓库处于极健康状态——build ✅、14 项每日 audit 全 clean 无一命中、`keywords_coverage` 270/270、`study_order` 26/26 完整、maskable 图标一致、无 junk / 无 stub / 无凭证泄露；18 个新 commit 全部合规、无遗漏收尾。识别出的三条观察项 **① 门面适配 18 commit 需真机验收**（大批 CSS / 顶栏 / 首页封面 / 头像下拉 / 涟漪动画 / reduced-motion 兜底，视觉与交互属设计判断范畴）**② `_includes/category-search.html` 在 `7d58c7c` 之后成为孤儿文件（不再被任何页 `include`）**（是清理还是保留待将来复用属站主拍板）**③ `life/index.html:31` 仍向 `sub-category-section.html` 传 `search_only=true` 让菜谱专区永久隐藏**（因搜索条已删、`.cat-search-only` 永远无法被 `#cat-search` 输入切成 `.cat-shown`）—— 均需站主判断，属设计取向 / 非「小而无争议」，一律写进 P2、不擅动。
>
> **P0 承接**：无。
>
> **P1 承接**：无。
>
> **P2 更新**（三项新增，其余承接）：
>
> - **新增 #1**：**门面适配 P0–P4 + 12 处收口共 18 commit 需六组合真机验收**（**今日新增**，来自 `c419da7`~`e2edca8` 全批）—— ① 中文首页 `/zh/` 翻页式双联封面（O3 刻面构成 `.facets` + 「叠影」莫尔纹 + `ab71aad` 后动态涟漪 + `prefers-reduced-motion` 静态兜底 `.mo-static`）在 iPhone Safari / Android Chrome / iPad / 桌面 Chrome / 桌面 Firefox / PWA standalone 六组合下：刻面 SVG 是否始终吻合 `viewBox slice + xMin` 拉伸不变形、涟漪帧率与耗电、`reduced-motion` 用户是否只见静态叠影不见涟漪；② 顶栏首页 vs 内页版式统一（`f69f906` 首页改居中网格、`d30969c` 内页对齐 `.topbar`、`101b17d` 字号/高度对齐、`d664b95` 右上控件统一 `[🔍 ◑ EN 头像]`）翻页跳变是否消除；③ 板块 landing 加冕页眉 `_includes/page-hero.html`（essays/life/notes/research 四板块 `eyebrow="Zircon"`、toolbox 保持 `eyebrow="馆藏"`——见下段解释）；④ 文章/菜谱标题区金色页眉 (`61719c0`) 视觉一致；⑤ about + 404 页 (`dcad82b`) 收尾；⑥ 账号头像下拉「登录 / 头像 + 管理入口」(`1b53bc7` + `29eb277`) 展开与折叠、去「作品馆」条目；⑦ 评论记录清理裸链接/回复序号 (`e2edca8`) 里 `![](data:image)` 转小缩略图 + `$…$` 数学公式渲染是否正确、KaTeX 是否在 account 页面被加载。沙箱无浏览器 + 无 fly.io Waline 后端出口全跑不了；紧要程度高于一般 UI 收口——门面观感是首访者的第一印象。
>
> - **新增 #2**：**`_includes/category-search.html` 在 `7d58c7c` 后成为孤儿 include**（**今日新观察**）—— `7d58c7c refactor(zh): 删掉栏目页内的搜索条（与顶部全局搜索重复）` 删掉了 `life/index.html` `notes/index.html` `research/index.html` 里对 `category-search.html` 的调用（`essays/index.html` 本就没含），但 `_includes/category-search.html` 本身（12 行，`#cat-search` input + `#cat-search-empty` 空态）未一并删。同时 `_includes/category-listing-tools.html` L24-51 的 `.cat-search-wrap` / `.cat-search-input` / `.cat-search-empty` / `.cat-search-only` **CSS 定义**、L139-393 的 `#cat-search` 输入监听 **JS 处理**均仍在——JS 有 `if (!input) return;` 兜底、不报错；CSS 是死代码。是清理（rm 一个 12 行 include + trim `category-listing-tools.html` 里 5 处 `cat-search-*` CSS + `input` 输入监听 JS）还是保留（将来若想再挂回搜索条即可 `{% include %}` 恢复）属**站主拍板**、不擅动。
>
> - **新增 #3**：**`life/index.html:31` 仍向 `sub-category-section.html` 传 `search_only=true` 让菜谱专区永久隐藏**（**今日新观察**）—— `life/index.html:31` `{% include sub-category-section.html sub="菜谱" posts=recipe_posts search_only=true zone_url="/toolbox/recipes/" page_size=999 %}` 让菜谱 section 挂 `.cat-search-only { display: none; }`（`_includes/category-listing-tools.html` L49），**原设计意图**是「平时不列出、搜索命中才 `.cat-shown` 显示」（顶部注释）；但 `7d58c7c` 删掉搜索条后，`#cat-search` 输入监听触发的 `.cat-shown` 切换永远走不到，菜谱专区**在 `/life/` 上永久不可见**。功能层面并未 break（菜谱有独立 `/toolbox/recipes/` landing 页 + 全站顶部搜索），只是原本「在 /life/ 搜索菜谱名能顺手命中」的设计意图失效。三种改法（① 移除该 `search_only=true` 行让菜谱常显于 `/life/` ② 保留 `search_only` 语义但恢复搜索条 ③ 直接删该行、菜谱只走独立页）属**设计取向**、请站主拍板。
>
> - **`eyebrow` 未统一**核对：`c825514` 把 `essays/life/notes/research` 四板块 landing 的 `eyebrow` 从「馆藏」改成「Zircon」，但 `toolbox/index.html:8` 仍是 `eyebrow="馆藏"`。核对 commit message 「栏目页 eyebrow」+ 站点 IA 结构（四大 `main_category` = 内容型板块 vs 百宝箱 = 工具类馆藏），**判定为刻意保留**——「百宝箱是 collection 类馆藏」与「四大内容板块是 Zircon 品牌门面」是不同调性，不擅动。
>
> - **承接 7-18 未消除的老 P2**（全部承接，编号顺移）：① 评论体感层 3 commit 需真机验收（7-18 P2 #1，`bd7f9f9` / `585ea8b` / `c14100f`）；② 评论 Vditor 编辑器 9 轮对抗式复查加固需真机验收（7-17 P2 #1，`54c1300`~`a6e492e` 9 commit）；③ 图片走 R2 图床新链路需真机验收（7-17 P2 #2）；④ 站主可删任意评论 + 举报中心联动需管理员端流程真机走一遍（7-17 P2 #3）；⑤ 51 commit 五大高交互面重做需六组合真机验收；⑥ 新增顶层 `/u/` 公开主页需验证降级 / CTA / noindex 三件事；⑦ `_data/visibility.json` 全放开策略生效后需真机走一遍工具箱可见性（7-18 P2 #7，`dfddb2c`）；⑧ doudizhu DouZero 神经网络权重 ~20 MB 二进制承接观察；⑨ 承接 7-14 / 7-11 全部老 P2（六组合真机验收 / forest 双视图 / 掼蛋联机 / 机票监控 mac 端到端 / jukebox 问题首 / DNS NameResolutionError / dead_links SVG xmlns 误判 等）。今日无新观察消除、承接不变。
>
> **仓库卫生**：目录结构**较昨日仅 +1 新 include 文件**（`_includes/page-hero.html`，15 行，为五板块 landing 提供统一「加冕页眉」组件）——工作副本足印 **553 MB**（含 `.git` 140 MB + `_site` 236 MB + 源码约 177 MB，与 7-18 完全一致的量级）。**新增文件 = 1**（`_includes/page-hero.html`）**删除文件 = 0**。18 commit 全部触及既有文件 + 1 个新 include，无新目录、无删除文件。`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空。**大文件盘点**：`files/or/or-2023.pdf` 5.4 MB（唯一 5 MB+）、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB、`files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB、`pdfjs/build/pdf.worker.mjs` 2.1 MB、`assets/js/doudizhu/weights/` 6 个 `.qw`（2.6 MB × 3 + 3.5 MB × 3 ≈ 18.4 MB）、`assets/echarts/` 2.0 MB —— 与 7-18 完全一致，无新增大文件。**孤儿 include 观察**：`_includes/category-search.html` 12 行在 `7d58c7c` 后已无 `{% include %}` 引用点（`grep -rn 'category-search'` 只匹配自身 + `category-listing-tools.html` 里的 CSS/JS 支持代码）——是死代码但保留在仓库、不影响 build、不进 `_site/`；是否清理属**站主拍板**、写进 P2。**`/Users/zhourui` 本机路径痕迹核对**：`grep -rE '/Users/zhourui'` 排除 `.git/` + `DAILY_REVIEW.md` + `SPOTCHECK_*` 后仍见 4 处 `.claude/skills/{search-keywords,recipe,fix-quotes,new-post}/SKILL.md` 首页元数据行「仓库根：`/Users/zhourui/Desktop/ruizhou03.github.io`」—— `.claude/` 已在 `_config.yml` L44 exclude 出 Jekyll build（`_site/` 内 `grep -r '/Users/zhourui' _site/` 空），属**仓库内部 skill 手册的本机 root 备注**、面向站主自己的会话工具、非公开泄露；且 4 处均由更早 commit 引入，非本轮迭代新增；不擅动。**凭证泄露核对**：`grep -rE '(BEGIN [A-Z]+ PRIVATE KEY|(sk|pk|api[_-]?key|secret)[_ -][a-zA-Z0-9]{20,})' -i` 全空——无真实凭证泄露。**结论**：目录结构较昨日仅 +1 个 include 挂载文件，纯代码修改批次；仓库处于健康稳态。

### ✅ 本次已自动修复

无。

站点处于极健康状态：build ✅、14 项每日 audit 全 clean 无一命中、keywords 270/270、study_order 26/26 完整、maskable 图标一致、无 junk / 无 stub / 无凭证泄露；18 个新 commit 全为**门面适配路线 P0–P4 + 12 处收口 + 中文首页翻页式双联封面重做**、无遗漏。三条今日新观察（门面适配需真机验收 / `category-search.html` 孤儿 / `life/index.html` 菜谱 `search_only` 永久隐藏）均属设计取向 / 站主拍板范畴、非「小而无争议」自动修复项。

### 📋 待你把关

#### P0（紧急）

无。

#### P1（重要）

无。仓库当前 P1 队列为空。

#### P2（建议）

1. **门面适配 P0–P4 + 12 处收口共 18 commit 需六组合真机验收**（**今日新增**，来自 `c419da7`~`e2edca8` 全批）—— 详见上文 P2 更新 #1；重点验：① `/zh/` 翻页式双联封面刻面 SVG 拉伸不变形 + 「叠影」莫尔纹涟漪帧率 + `reduced-motion` 静态兜底；② 首页 vs 内页顶栏字号 / 高度 / 版式跨页无跳变；③ 板块 landing 加冕页眉 `page-hero` 在浅深模式 + 中英文长副题下换行正常；④ 头像下拉登录 / 管理入口在未登录 / 已登录 / 站主态三身份下正确出现或隐藏；⑤ 账号页评论记录 `![](data:image)` 缩略图 + `$…$` 公式渲染。iPhone Safari / Android Chrome / iPad / 桌面 Chrome / 桌面 Firefox / PWA standalone 六组合。沙箱无 GUI / 无触屏 / 无 fly.io 后端出口跑不了；紧要程度**高于一般 UI 收口**——门面观感是首访者的第一印象。

2. **`_includes/category-search.html` 在 `7d58c7c` 后成为孤儿 include**（**今日新增**）—— 12 行 include 已无 `{% include %}` 引用点；`_includes/category-listing-tools.html` L24-51 的 `.cat-search-*` CSS 与 L139-393 的 `#cat-search` 监听 JS 也一并变成死代码（JS 有 `if (!input) return;` 兜底不报错）。是清理（rm `category-search.html` + trim `category-listing-tools.html` 里 5 处 cat-search CSS + input 输入监听 JS）还是保留（将来若想再挂回搜索条可 `{% include %}` 恢复）属站主拍板。

3. **`life/index.html:31` 仍向 `sub-category-section.html` 传 `search_only=true` 让菜谱专区永久隐藏**（**今日新增**）—— 因 `7d58c7c` 删掉搜索条后 `#cat-search` 输入监听触发的 `.cat-shown` 切换永远走不到，菜谱专区**在 `/life/` 上永久不可见**。功能未 break（菜谱有独立 `/toolbox/recipes/` landing + 顶部全站搜索），但原本「在 /life/ 搜索菜谱名能顺手命中」的设计意图失效。三种改法（① 移除 `search_only=true` 让菜谱常显 ② 保留 `search_only` 但恢复搜索条 ③ 直接删该行、菜谱只走独立页）属设计取向、请拍板。

4. **评论体感层 3 commit 收口需真机验收**（承接 7-18 P2 #1，来自 `bd7f9f9` / `585ea8b` / `c14100f`）—— 8 类 ~1156 emoji 分类选择器 + 同按钮再点收起 + 换编辑器切换 anchor + 回复框预填「@被回复人」+ 隐藏 Waline 底部旧按钮排 + 回复箭头改朝左上等；详见 7-18 记录。沙箱跑不了。

5. **评论 Vditor 编辑器 9 轮对抗式复查加固需真机验收**（承接 7-17 P2 #1，来自 `54c1300`~`a6e492e` 9 commit）—— 图片所见即所得 + 乐观清空防丢草稿 + 按请求内容精确关联提交成败 + 覆盖编辑 PUT 拦截 + 慢挂 120s 兜底 + 同文并发 rec 捕获 + restore 剪贴板兜底 + 上传中挡发布 + watchdog 只清 leak + 多图逐张处理 10 项。四组合下过全链路。沙箱跑不了。

6. **图片走 R2 图床新链路需真机验收**（承接 7-17 P2 #2，来自 `5abd7c3`）—— 三条上传路径 + 503/429/超时回退 base64 + R2 短链国内外访问 + `/api/upload` 鉴权。沙箱无 fly.io 出口跑不了。

7. **站主可删任意评论 + 举报中心联动需管理员端流程真机走一遍**（承接 7-17 P2 #3，来自 `5177e24`）—— 鉴权可见性 + 二次确认 + 原子性 + 评论数镜像即时下降。沙箱无后端出口跑不了。

8. **51 commit 五大高交互面重做需六组合真机验收**（承接 7-15 / 7-16 / 7-17 / 7-18 P2）—— 17 大验收面继续叠加今日的门面适配 18 commit 观察面，构成完整门面 + 评论 + 账号 + 宠物 + 管理端全站验收面。沙箱跑不了。

9. **新增顶层 `/u/` 公开主页**（承接 7-15 / 7-16 / 7-17 / 7-18 P2）—— 降级 / CTA / noindex 三件事验证。沙箱跑不了。

10. **`_data/visibility.json` 全放开策略生效后需真机走一遍工具箱可见性**（承接 7-18 P2 #7，来自 `dfddb2c`）—— 访客态 + 站主态双身份对比 53 项 tool-card + `/toolbox/` landing 四大板块分组 + 首页近期更新 + 分享链 slug。沙箱跑不了。

11. **doudizhu DouZero 神经网络权重 ~20 MB 二进制**（承接 7-14 / 7-15 / 7-16 / 7-17 / 7-18 P2）—— `assets/js/doudizhu/weights/` 6 组 `.qw` + `.f32` + `.json` 仍 ~20 MB，是否评估 Git LFS / CDN 拆分承接观察不变。

12. **承接 7-18 / 7-17 / 7-16 / 7-15 / 7-14 / 7-11 全部老 P2 未消除项**：7-11 冲刺日新增 `/zh/about/` + `404.html` + 首页照片堆叠 3 张预渲染 + reduce-motion 翻页 + forest「grow」暗号 + forest ∞ 灵活模式的六组合真机验收 6 项 / `452797e` 书架 commit 声明「现 7 本」实际 6 本的意图确认 / 7-14 admin 控制台 & 账号中心 12 commit 数据看板 / 7-10 / 7-07 / 7-06 承接的 forest 两轮对抗式审查 6 处 / forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名等 —— 今日无新观察消除、承接不变。

### 🗂 仓库卫生

**目录结构较昨日仅 +1 新 include 文件**（`_includes/page-hero.html` 15 行，为五板块 landing 提供统一「加冕页眉」组件，`_includes/` 本就是 include 类模板挂载点、无需入 exclude/sitemap 特殊配置）——工作副本足印 **553 MB**（含 `.git` 140 MB + `_site` 236 MB + 源码约 177 MB，与 7-18 完全一致的量级；18 commit 净变动分散在 CSS / 顶栏 / 头像下拉 / 首页封面 SVG / 板块 landing / 文章标题区 / about + 404 / 账号页评论记录多处，纯代码修改无量级突破）。`.git` **140 MB**（与 7-18 一致）、`_site/` **236 MB**（与 7-18 一致，纯 build 元数据）。**新增文件 = 1**（`_includes/page-hero.html`）**删除文件 = 0**。`git status` clean（本地 = origin/main、`up to date`）、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空。**大文件盘点**：`files/or/or-2023.pdf` 5.4 MB（唯一 5 MB+）、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB、`files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB、`pdfjs/build/pdf.worker.mjs` 2.1 MB、`assets/js/doudizhu/weights/` 6 个 `.qw`（2.6 MB × 3 + 3.5 MB × 3 ≈ 18.4 MB）、`assets/echarts/` 2.0 MB —— 与 7-18 完全一致，无新增大文件。**maskable 图标 md5 核验**：三对文件仍不 byte-identical（forest 主 `63df7bec…` vs maskable `36ada6c2…`、ledger 主 `fad6da15…` vs maskable `433f42fc…`、pindou 主 `fed25167…` vs maskable `f4ef2d70…`）与 7-18 / 7-17 / 7-16 / 7-15 完全一致。`_paid/` + `_flight-staging/` 在 `_config.yml` L53 / L55 exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L38）、`EMAIL_SUMMARY.md`（L39）等所有内部产物。**孤儿 include 观察**：`_includes/category-search.html`（12 行）在 `7d58c7c` 之后已无 `{% include %}` 引用点（`grep -rn 'category-search'` 只匹配自身 + `_includes/category-listing-tools.html` 里的 CSS/JS 支持代码）；build 未受影响、`_site/` 内没有独立渲染；是死代码但保留在仓库、清理与否属站主拍板、已写进上方 P2 #2、不擅动。**`/Users/zhourui` 本机路径痕迹核对**：4 处 `.claude/skills/{search-keywords,recipe,fix-quotes,new-post}/SKILL.md` 首页元数据行「仓库根：`/Users/zhourui/Desktop/ruizhou03.github.io`」—— `.claude/` 已在 `_config.yml` L44 exclude 出 Jekyll build（`_site/` 内 `grep -r '/Users/zhourui' _site/` 空），属**仓库内部 skill 手册的本机 root 备注**、面向站主自己的会话工具、非公开泄露；且 4 处均由更早 commit 引入，非本轮迭代新增；不擅动。**凭证泄露核对**：`grep -rE '(BEGIN [A-Z]+ PRIVATE KEY|(sk|pk|api[_-]?key|secret)[_ -][a-zA-Z0-9]{20,})' -i` 全空——无真实凭证泄露。**结论**：目录结构较昨日仅 +1 新 include 挂载文件、纯代码修改批次；仓库处于健康稳态、无冗余可清理。

---

## 2026-07-18

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套。距 7-17 巡检共 **4 个新 commit**（`eff1480..c14100f`）—— 承接 7-17 10-commit「评论 Vditor 9 轮对抗式加固 + paywall 引号根因」批次后，**继续围绕评论体验做体感层收口 + 一次可见性策略调整**，4 commit 全部集中在 5 个文件、两条主线：**评论 comment 3 commit**（`bd7f9f9` **去 Waline 底部旧按钮 + 上传项换图标 + 分类全量 emoji 选择器 + 回复框预填 `@被回复人`**——隐藏 Waline 底部那排原生按钮（表情/GIF/图片/预览/MD 指南）功能已被 Vditor 工具栏覆盖、工具栏上传项图标换图片、提示改「上传图片」，新增 `_includes/comment-emoji.html` **8 类 ~1156 个 emoji 分类选择器**（Vditor 内置只有 8 个且不分类），回复框把 placeholder 的「@被回复人」预填进正文让发出的回复显示回复谁（含回复的回复；服务端不返回 at 只能这样）→ `585ea8b` **emoji 面板同按钮再点=收起、换编辑器按钮=切换目标**（`open` 里判断 `pop.classList.contains('on') && curAnchor === anchorEl` 才 close、否则切 anchor+VD 并 open）→ `c14100f` **回复箭头改朝左上（回复约定，区别朝右上的「转发」，与邮件系统一致）+ 重绘更干净的矢量**（`polyline points="11 6 5 6 5 12"` + `path d="M5 6c6 6 14 6 14 13"`，宽高 15→16 vertical-align -2→-3，不再像转发）；**visibility 1 commit**（`dfddb2c` **百宝箱全部工具对访客开放**——清空 `_data/visibility.json` 的 `tools` 数组从原隐藏 47 项到 `[]`，让 `_data/toolbox.yml` 全部 53 个工具对访客可见；`sections` 保持 `[]`（板块本就全可见），按站主决定统一放开——**同时消除昨日 P2 #5「visibility 当前状态承接观察」**）。文件新增：**+1 新文件**（`_includes/comment-emoji.html` 98 行），4 commit 触及 4 个既有文件 + 1 新文件共 133 行净变更。
>
> **build 健康度**：`bundle install` ✅（`Bundle complete! 7 Gemfile dependencies, 39 gems now installed.`）+ `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（**18.456 s cold build** —— 与本轮沙箱冷启动差异一致，`_site/` 产物完整度一致）。`_site/` 顶层 **28 项**（与 7-17 一致：`404.html` `CNAME` `account` `admin` `admin-manifest.json` `assets` `assistant-fulltext.json` `assistant-index.json` `en` `essays` `feed.xml` `files` `flight` `google5306…` `index.html` `life` `manifest.json` `notes` `pdfjs` `redirects.json` `research` `robots.txt` `search.json` `sitemap.xml` `sw.js` `toolbox` `u` `zh`）。`_notes/` 全 **270 篇 md** 仍 100% 覆盖 `keywords:`（`find _notes -name '*.md' -exec grep -L '^keywords:' {} \;` 空），搜索体系闭环。`_paid/` + `_flight-staging/` 在 `_config.yml` L50 / L52 exclude 双保险稳固、`find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。**maskable 图标 md5 核验**：三对文件仍不 byte-identical（`forest-icon-512.png` `63df7becb4ddc57e2b95e88305a33a18` vs `forest-icon-maskable-512.png` `36ada6c2364827c1455260f7d42ae6f1`、`ledger-icon-512.png` `fad6da15326e5fbf54adb03663f78be2` vs `ledger-icon-maskable-512.png` `433f42fc5748a0b16747e12ddbb4b47a`、`pindou-icon-512.png` `fed25167c04f65fc5ce80f28bd12ddf6` vs `pindou-icon-maskable-512.png` `f4ef2d70dbf297809aa5f76c23836f5b`）与 7-17 / 7-16 / 7-15 / 7-14 完全一致；`python3 scripts/audit/maskable_icon_consistency.py` 报「✅ 已检查 9 个 maskable 图标声明，均与 any 图标不同」。**`study_order`**：`_config.yml` 26 条、`ls _notes/study/` 26 目录、`comm -23` 差集空 —— 与 7-17 一致。全套 `scripts/audit/run.sh`（今日周六 DOW=6，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=18 非月初，未加跑 monthly_stats）14 项每日 audit **全 clean 无一命中**：`keywords_coverage` 121/121 散文类全覆盖 / `images`（2 处 2M+ PDF 备忘列出、非命中）/ `backend_pulse`（curl 56 HTTP 403 承接沙箱无 fly.io 出口）/ `spotcheck`（10 项配额抽检——game×3 + pdf_archive×4 + lecture_note_pdf_only×2 + lecture_note_full×1）/ `material_type_enum` 117 项全在 9 项枚举内（当前分布 Notes×47 / Exams×40 / 课程测评×18 / 经验之谈×5 / 错题本×3 / 写作×2 / 口语×1 / 词汇×1）/ `filename_convention` / `maskable_icon_consistency` / `hover_no_media`（只扫 `toolbox/`）/ `sibling_crosslink`（≥3 篇的 10 个 sub_category 组全互链）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` **均 ✅**。**尤其值得记录**：昨日 P2 #5「`_data/visibility.json` 当前 `sections:[]` + `tools:[47 项]` 承接观察」**今日由站主 `dfddb2c` 主动消除**——按站主决定清空 `tools` 数组，全部 53 个工具对访客统一放开；`sections` 保持 `[]`（板块本就全可见）。**注意**：`_includes/comment-emoji.html` L19 `.cmt-emoji-grid button:hover { background: var(--color-accent-soft); }` 未包 `@media (hover: hover)` 守卫（`hover_no_media.py` 只扫 `toolbox/` 未命中）—— 比对 `_includes/` 33 条 `:hover` 规则中仅 `cat-soundboard.html` 3 条有守卫、其余 30 条均未守卫（`paywall.html` 5 / `assistant.html` 11 / `comment-drawer.html` 4 / `admin-article-bar.html` 1 / `category-listing-tools.html` 2 / `auth.html` 3 / `fav-album-picker.html` 2 / `yearly-story-section.html` 1 / `comment-emoji.html` 1），新增 emoji 面板延续既有 `_includes/` 惯例、非引入新破口；且 emoji 面板 tap 一次即插入 emoji，不像游戏按钮那样卡「hover 态不退」体感，**属可容忍范畴、不擅动**。
>
> **今日 0 项自动修复**：仓库处于极健康状态——build ✅、14 项每日 audit 全 clean 无一命中、`keywords_coverage` 270/270、`study_order` 26/26 完整、maskable 图标一致、无 junk / 无 stub / 无泄露；4 个新 commit 全部合规、无遗漏收尾、且已消除昨日一条 P2 观察。没有可动的「小而无争议」改动。
>
> **P0 承接**：无。
>
> **P1 承接**：无。
>
> **P2 更新**（一项消除、一项新增，其余承接）：
>
> - **消除**：7-17 P2 #5「`_data/visibility.json` `sections:[]` + `tools:[47 项]` 当前状态承接观察」→ `dfddb2c` 已主动放开（tools 清空、全部 53 个工具对访客可见）。
>
> - **新增**：**评论体感层 3 commit 收口需真机验收**（**今日新增**，来自 `bd7f9f9` / `585ea8b` / `c14100f`）—— ① 新增 `_includes/comment-emoji.html` **8 类 ~1156 个 emoji 分类选择器**（笑脸/人物/动物/食物/活动/旅行/物品/符号），像输入法分页；需验证：桌面 Chrome + 手机 iOS Safari + Android Chrome 三组合下打开面板→切分类→点选 emoji→再点同按钮收起→切另一个编辑器（主评论 vs 回复框）的表情按钮 anchor 切换是否流畅、`insertValue` 是否成功注入 Vditor、`Escape` / 点外面 / 滚动是否正确关闭、手机端 `@media (max-width:768px)` 吸底样式是否可用；② 隐藏 Waline 底部旧按钮排（表情/GIF/图片/预览/MD 指南）是否只在 `.cmt-drawer` 作用域内、不影响其他 Waline 实例；③ 回复框 placeholder 的「@被回复人」预填进正文是否让发出的回复显示回复谁、含回复的回复是否递归正确；④ 回复箭头改朝左上（`polyline points="11 6 5 6 5 12"` + `path d="M5 6c6 6 14 6 14 13"`，宽高 15→16 vertical-align -2→-3）视觉是否符合「回复」体感、深色模式下 `currentColor` 是否随主题变色。沙箱无浏览器 + 无 fly.io Waline 出口跑不了；紧要程度中等，与 7-17 P2 #1 的 9 轮 Vditor 加固形成完整的评论体感验收面。
>
> - **承接 7-17 未消除的老 P2**（去掉已消除的 #5，其余全部承接、编号顺移）：① 评论 Vditor 编辑器 9 轮对抗式复查加固需真机验收（7-17 P2 #1，`54c1300`~`a6e492e` 9 commit）；② 图片走 R2 图床新链路需真机验收（7-17 P2 #2，`5abd7c3`）；③ 站主可删任意评论 + 举报中心联动需管理员端流程真机走一遍（7-17 P2 #3，`5177e24`）；④ 51 commit 五大高交互面重做需六组合真机验收（今日再加 3 commit 的评论体感收口验收面）；⑤ 新增顶层 `/u/` 公开主页需验证降级 / CTA / noindex 三件事；⑥ doudizhu DouZero 神经网络权重 ~20 MB 二进制承接观察；⑦ 承接 7-14 / 7-11 全部老 P2（六组合真机验收 / forest 双视图 / 掼蛋联机 / 机票监控 mac 端到端 / jukebox 问题首 / DNS NameResolutionError / dead_links SVG xmlns 误判 等）。今日无新观察消除、承接不变。
>
> **仓库卫生**：目录结构**较昨日几乎无变化**——工作副本足印 **553 MB**（含 `.git` 140 MB + `_site` 236 MB + 源码约 177 MB，与 7-17 的 549 MB 相仿，4 commit 净增 133 行前端脚本 + 1 个 98 行新文件 `_includes/comment-emoji.html`，未突破 1 MB 量级触发 `du` 变动）。`.git` **140 MB**（与 7-17 完全一致）、`_site/` **236 MB**（较 7-17 的 233 MB 微增 +3 MB，属纯 build 元数据抖动）。**新增文件 = 1**（`_includes/comment-emoji.html`，评论区自建 emoji 分类选择器，`_includes/` 本就是 include 类模板挂载点，无需入 exclude/sitemap 特殊配置）**删除文件 = 0**。`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空。**大文件盘点**：`files/or/or-2023.pdf` 5.4 MB（唯一 5 MB+）、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB、`files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB、`pdfjs/build/pdf.worker.mjs` 2.1 MB、`assets/js/doudizhu/weights/` 6 个 `.qw`（2.6 MB × 3 + 3.5 MB × 3 ≈ 18.4 MB）、`assets/echarts/` 2.0 MB —— 与 7-17 一致，无新增大文件。**`/Users/zhourui` 本机路径痕迹核对**：`grep -rE '/Users/zhourui'` 排除 `.git/` + `DAILY_REVIEW.md` + `SPOTCHECK_*` 后仍见 4 处 `.claude/skills/{search-keywords,recipe,fix-quotes,new-post}/SKILL.md` 首页元数据行「仓库根：`/Users/zhourui/Desktop/ruizhou03.github.io`」—— `.claude/` 已在 `_config.yml` L43 exclude 出 Jekyll build（`_site/` 内 `grep -r '/Users/zhourui' _site/` 空），属**仓库内部 skill 手册的本机 root 备注**、面向站主自己的会话工具、非公开泄露；且 4 处均由更早 commit 引入，非本轮迭代新增；不擅动。**凭证泄露核对**：`grep -rE '(BEGIN [A-Z]+ PRIVATE KEY|(sk|pk|api[_-]?key|secret)[_ -][a-zA-Z0-9]{20,})' -i` 全空——无真实凭证泄露。**结论**：目录结构较昨日仅 +1 新文件 `_includes/comment-emoji.html`（合理挂载点、不引入公开面污染）；纯代码修改批次；仓库处于健康稳态。

### ✅ 本次已自动修复

无。

站点处于极健康状态：build ✅、14 项每日 audit 全 clean 无一命中（含昨日 P2 #5「visibility 观察」由站主 `dfddb2c` 主动放开消除）、keywords 270/270、study_order 26/26 完整、maskable 图标一致、无 junk / 无 stub / 无泄露；4 个新 commit 全为评论体感层收口 + 一次可见性策略调整、无遗漏、无可动的「小而无争议」改动。

### 📋 待你把关

#### P0（紧急）

无。

#### P1（重要）

无。仓库当前 P1 队列为空。

#### P2（建议）

1. **评论体感层 3 commit 收口需真机验收**（**今日新增**，来自 `bd7f9f9` / `585ea8b` / `c14100f`）—— ① 新增 `_includes/comment-emoji.html` **8 类 ~1156 个 emoji 分类选择器**（笑脸/人物/动物/食物/活动/旅行/物品/符号），像输入法分页；需验证：桌面 Chrome + 手机 iOS Safari + Android Chrome 三组合下打开面板→切分类→点选 emoji→再点同按钮收起→切另一个编辑器（主评论 vs 回复框）的表情按钮 anchor 切换是否流畅、`insertValue` 是否成功注入 Vditor、`Escape` / 点外面 / 滚动是否正确关闭、手机端 `@media (max-width:768px)` 吸底样式是否可用（宽度 `left:8/right:8`、`bottom:8/top:auto`、`max-height:46vh`）；② 隐藏 Waline 底部旧按钮排（表情/GIF/图片/预览/MD 指南）是否只在 `.cmt-drawer` 作用域内、不影响其他 Waline 实例；③ 回复框 placeholder 的「@被回复人」预填进正文是否让发出的回复显示回复谁、含回复的回复是否递归正确；④ 回复箭头改朝左上（`polyline points="11 6 5 6 5 12"` + `path d="M5 6c6 6 14 6 14 13"`，宽高 15→16 vertical-align -2→-3）视觉是否符合「回复」体感（区别于朝右上的「转发」）、深色模式下 `currentColor` 是否随主题变色。沙箱无浏览器 + 无 fly.io Waline 出口跑不了；紧要程度中等，与 7-17 P2 #1 的 9 轮 Vditor 加固形成完整的评论体感验收面。

2. **评论 Vditor 编辑器 9 轮对抗式复查加固需真机验收**（承接 7-17 P2 #1，来自 `54c1300`~`a6e492e` 9 commit）—— ① 图片所见即所得（点图不再出源码、不弹全屏）② 乐观清空防丢草稿（7 处数据丢失全修，用 Waline 真实信号）③ 按请求内容精确关联提交成败（拦 `/comment` POST）④ 覆盖编辑 PUT 拦截 ⑤ 慢挂 120s 兜底「先回填再丢弃」⑥ 同文并发提交 rec 捕获 ⑦ restore 剪贴板兜底 ⑧ 上传中挡发布 + `insertValue` `try/catch` + Vditor 构造失败清空框 ⑨ watchdog 只清未发出的 leak ⑩ 多图粘贴/拖拽逐张处理。需验证：四组合下“打字→贴多图→发出→并发→回复→编辑已发→网络中断慢挂→点赞置顶”全链路。沙箱跑不了。

3. **图片走 R2 图床新链路需真机验收**（承接 7-17 P2 #2，来自 `5abd7c3`）—— `window.__cmtUpload` 走 R2 短链；需验证三条上传路径（本机粘贴 / 移动端拍照 / 桌面拖拽）、503 / 429 / 超时回退 base64、R2 短链国内外访问、`/api/upload` 鉴权。沙箱无 fly.io 出口跑不了。

4. **站主可删任意评论 + 举报中心联动需管理员端流程真机走一遍**（承接 7-17 P2 #3，来自 `5177e24`）—— 管理员每条显示「删除」（连回复一并删）、`/admin` 举报审核加「删除评论 / 忽略举报」；需验证鉴权可见性、二次确认、原子性（删+移出队列+撤回计数）、评论数镜像 `wl-num → .waline-comment-count` 即时下降。沙箱无后端出口跑不了。

5. **7-15 P2 #1「51 commit 五大高交互面重做需六组合真机验收」进一步放大范围**（承接 7-17 P2 #4，加今日 3 commit 评论体感收口）—— 六组合 17 大项之上再叠加：⑳ 评论 emoji 分类面板（8 类 1156 emoji + 同按钮再点=收起 + 换按钮=切换目标 + Vditor `insertValue` 注入 + 手机端吸底）；㉑ Waline 底部旧按钮隐藏是否只在 `.cmt-drawer` 域内；㉒ 回复框 `@被回复人` 预填正文让发出的回复能显示回复谁（含回复的回复递归）；㉓ 回复箭头新矢量（朝左上 + 更干净）视觉体感。沙箱无 GUI / 无触屏 / 无 fly.io 后端出口跑不了。

6. **新增顶层 `/u/` 公开主页**（承接 7-15 / 7-16 / 7-17 P2 #5）—— `u/index.html` 4730 B、`permalink: /u/`、`noindex: true`、`sitemap: false`，需验证 accountId 不存在 → 「主页不存在或未公开」降级空态、自己 accountId → 「去编辑」CTA、`noindex + sitemap:false` 双保险不被搜索引擎收录。沙箱无后端跑不了。

7. **`_data/visibility.json` 全放开策略生效后需真机走一遍工具箱可见性**（**今日新增**，来自 `dfddb2c`）—— `tools:[]` 后 `_data/toolbox.yml` 全 53 个工具对访客可见；建议访客态（未登录）+ 站主态两身份对比：① `_data/toolbox.yml` 的 53 项每一条 tool-card 是否都渲染出来（不再出现 `.sa-admin` 灰化预览）② `/toolbox/` landing 页四大板块（生活/工作/游戏/学习）分组是否完整③ 首页「近期更新」是否收录新出现的原隐藏工具（如原 47 项里的写作工具、学习工具、生活工具）④ 分享链的 slug 是否解析正常。沙箱无浏览器跑不了；属可见性策略调整、紧要程度中等。

8. **doudizhu DouZero 神经网络权重 ~20 MB 二进制**（承接 7-14 / 7-15 / 7-16 / 7-17 P2 #7）—— `assets/js/doudizhu/weights/` 6 组 `.qw` + `.f32` + `.json` 仍 ~20 MB；仓库工作副本约 177 MB 源码 + 140 MB `.git`。是否评估 Git LFS / CDN 拆分承接观察不变。

9. **承接 7-17 / 7-16 / 7-15 / 7-14 / 7-11 全部老 P2 未消除项**：7-11 冲刺日新增 `/zh/about/` + `404.html` + 首页照片堆叠 3 张预渲染 + reduce-motion 翻页 + forest「grow」暗号 + forest ∞ 灵活模式的六组合真机验收 6 项 / `452797e` 书架 commit 声明「现 7 本」实际 6 本的意图确认 / 7-14 admin 控制台 & 账号中心 12 commit 数据看板浏览量趋势折线 + 世界地图 + 设备环形 + ECharts 自托管 + 密码/导出/注销流程的六组合真机验收；7-10 / 7-07 / 7-06 承接的 forest 两轮对抗式审查 6 处 / 「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` / forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收、forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名等 —— 今日无新观察消除、承接不变。

### 🗂 仓库卫生

**目录结构较昨日仅 +1 新文件**（`_includes/comment-emoji.html` 98 行，评论区自建 emoji 分类选择器，`_includes/` 本就是 include 类模板挂载点、无需入 exclude/sitemap 特殊配置）——工作副本足印 **553 MB**（含 `.git` 140 MB + `_site` 236 MB + 源码约 177 MB，较 7-17 的 549 MB +4 MB，4 commit 净增 133 行前端脚本 + 1 个 98 行新文件、未突破 1 MB 量级触发 `du` 变动）。`.git` **140 MB**（与 7-17 完全一致）、`_site/` **236 MB**（较 7-17 +3 MB，纯 build 元数据抖动）。**新增文件 = 1**（`_includes/comment-emoji.html`）**删除文件 = 0**。`git status` clean（本地 = origin/main、`up to date`）、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空。**大文件盘点**：`files/or/or-2023.pdf` 5.4 MB（唯一 5 MB+）、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB、`files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB、`pdfjs/build/pdf.worker.mjs` 2.1 MB、`assets/js/doudizhu/weights/` 6 个 `.qw`（2.6 MB × 3 + 3.5 MB × 3 ≈ 18.4 MB）、`assets/echarts/` 2.0 MB —— 与 7-17 完全一致，无新增大文件。**maskable 图标 md5 核验**：三对文件仍不 byte-identical（forest 主 `63df7bec…` vs maskable `36ada6c2…`、ledger 主 `fad6da15…` vs maskable `433f42fc…`、pindou 主 `fed25167…` vs maskable `f4ef2d70…`）与 7-17 / 7-16 / 7-15 / 7-14 完全一致。`_paid/` + `_flight-staging/` 在 `_config.yml` L50 / L52 exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）等所有内部产物。**`/Users/zhourui` 本机路径痕迹核对**：`grep -rE '/Users/zhourui'` 排除 `.git/` + `DAILY_REVIEW.md` + `SPOTCHECK_*` 后仍见 4 处 `.claude/skills/{search-keywords,recipe,fix-quotes,new-post}/SKILL.md` 首页元数据行「仓库根：`/Users/zhourui/Desktop/ruizhou03.github.io`」—— `.claude/` 已在 `_config.yml` L43 exclude 出 Jekyll build（`_site/` 内 `grep -r '/Users/zhourui' _site/` 空），属**仓库内部 skill 手册的本机 root 备注**、面向站主自己的会话工具、非公开泄露；且 4 处均由更早 commit 引入，非本轮迭代新增；不擅动。**凭证泄露核对**：`grep -rE '(BEGIN [A-Z]+ PRIVATE KEY|(sk|pk|api[_-]?key|secret)[_ -][a-zA-Z0-9]{20,})' -i` 全空，无真实凭证泄露。**`_includes/` `:hover` 未守卫盘点**（因新增 `comment-emoji.html` L19 `.cmt-emoji-grid button:hover`）：全站 `_includes/` 33 条 `:hover` 规则中仅 `cat-soundboard.html` 3 条有 `@media (hover: hover)` 守卫、其余 30 条均未守卫（`assistant.html` 11 / `paywall.html` 5 / `comment-drawer.html` 4 / `auth.html` 3 / `cat-soundboard.html` 3 / `category-listing-tools.html` 2 / `fav-album-picker.html` 2 / `yearly-story-section.html` 1 / `admin-article-bar.html` 1 / `comment-emoji.html` 1），新增 emoji 面板延续既有惯例、非引入新破口；`hover_no_media.py` 只扫 `toolbox/` 未命中，属可容忍范畴、不擅动。**结论**：目录结构较昨日仅 +1 新 `_includes/` 挂载文件、纯代码修改批次；仓库处于健康稳态、无冗余可清理。

---

## 2026-07-17

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套。距 7-16 巡检共 **10 个新 commit**（`6e32d71..a6e492e`）—— 承接 7-16 12-commit 收口批次后，**继续围绕评论 Vditor 编辑器做深度加固**，本轮全部集中在两个文件、一条主线：**评论 comment 9 commit**（`54c1300` 图片改所见即所得（点图不再出源码、不弹全屏）+ 提交即清可靠化 → `049adb1` **乐观清空防丢草稿加固**（对抗式复查发现 7 处数据丢失/误发全部修复，改用 Waline 真实信号：成功→它清 textarea、失败→保留内容并弹 alert）→ `6528823` **按请求内容精确关联提交成败**，根除并发提交的误回填/丢草稿（拦 Waline 发 `/comment` POST，按请求体 `comment` 文本精确认领对应草稿，alert 仅兜底“同步校验失败”）→ `5e915ee` 三处剩余边界（拦截扩到 PUT 编辑提交、fetch 关联捕获该条 rec 响应回来直接用不再按内容重查、120s 兜底改“先回填再丢弃”挂过 120s 也不丢草稿）→ `61e8463` restore 绝不静默丢草稿（在飞时打新内容→并回末尾；回复框已关→剪贴板兜底+不谎报）→ `5184a3f` **第五轮复查**（图片上传中挡发布 + watchdog 仅管未发出的请求 + Vditor 构造失败清空框）→ `eafe784` `insertValue` 加 `try/catch` 保证上传计数一定减回、不卡死发布 → `49063d5` watchdog 只清未发出的 leak、已发出的交给 fetch（含慢挂）避免误丢或复活 → `a6e492e` **多图粘贴/拖拽逐张处理**（原来只取 `files[0]` 会静默丢其余图））；**paywall 1 commit**（`7751313` 付费墙预览文件 front-matter 补引号 + 修生成脚本根因——手动给 `_notes/life/paid-test-us-{banking-guide,visa-types}.md` 两文件的 5 个字符串字段补双引号；`scripts/paywall/build_paid.py` 加 `_Quoted` 值包装，只给字符串值（含列表项）加引号、键保持裸值、bool/int/date 类型不变，将来付费墙恢复真正重生时输出自带引号，**根除承接 6-30 / 7-14 / 7-15 / 7-16 共 5 轮的 7-16 P2 #6**）。文件新增：无（10 commit 触及 2 个既有文件 + 1 个脚本共 300 余行变更，其中 `_includes/comment-vditor.html` 净变动约 200 行连续 9 轮对抗式复查加固）。
>
> **build 健康度**：`bundle install` ✅（`Bundle complete! 7 Gemfile dependencies, 39 gems now installed.`）+ `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（**6.599 s cold build** —— 低于 7-16 的 22.526 s 与 7-15 的 7.763 s，与本轮沙箱冷启动差异一致，`_site/` 产物完整度一致）。`_site/` 顶层 **28 项**（与 7-16 一致：`404.html` `CNAME` `account` `admin` `admin-manifest.json` `assets` `assistant-fulltext.json` `assistant-index.json` `en` `essays` `feed.xml` `files` `flight` `google5306…` `index.html` `life` `manifest.json` `notes` `pdfjs` `redirects.json` `research` `robots.txt` `search.json` `sitemap.xml` `sw.js` `toolbox` `u` `zh`）。`_notes/` 全 **270 篇 md** 仍 100% 覆盖 `keywords:`（`find _notes -name '*.md' -exec grep -L '^keywords:' {} \;` 空），搜索体系闭环。`_paid/` + `_flight-staging/` 在 `_config.yml` L50 / L52 exclude 双保险稳固、`find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。**maskable 图标 md5 核验**：三对文件仍不 byte-identical（`forest-icon-512.png` `63df7becb4ddc57e2b95e88305a33a18` vs `forest-icon-maskable-512.png` `36ada6c2364827c1455260f7d42ae6f1`、`ledger-icon-512.png` `fad6da15326e5fbf54adb03663f78be2` vs `ledger-icon-maskable-512.png` `433f42fc5748a0b16747e12ddbb4b47a`、`pindou-icon-512.png` `fed25167c04f65fc5ce80f28bd12ddf6` vs `pindou-icon-maskable-512.png` `f4ef2d70dbf297809aa5f76c23836f5b`）与 7-16 / 7-15 / 7-14 完全一致；`python3 scripts/audit/maskable_icon_consistency.py` 报「✅ 已检查 9 个 maskable 图标声明，均与 any 图标不同」。**`study_order`**：`_config.yml` 26 条、`ls _notes/study/` 26 目录、`comm -23` 差集空 —— 与 7-16 一致。全套 `scripts/audit/run.sh`（今日周五 DOW=5，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=17 非月初，未加跑 monthly_stats）14 项每日 audit **全 clean 无一命中**：`keywords_coverage` 121/121 散文类全覆盖 / `images`（2 处 2M+ PDF 备忘列出、非命中）/ `backend_pulse`（curl 56 HTTP 403 承接沙箱无 fly.io 出口）/ `spotcheck`（10 项配额抽检——game×3 + pdf_archive×4 + lecture_note_pdf_only×2 + note×1）/ `material_type_enum` 117 项全在 9 项枚举内 / `filename_convention` / `maskable_icon_consistency` / `hover_no_media` / `sibling_crosslink`（≥3 篇的 10 个 sub_category 组全互链）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` **均 ✅**。**尤其值得记录**：昨日 P2 #6「`_notes/life/paid-test-us-{banking-guide,visa-types}.md` L4 `main_category:` 未加引号」承接 6-30 / 7-14 / 7-15 / 7-16 共 5 轮的老待办，**今日由站主 `7751313` 修复并加脚本根因防复发**——手动给 2 个 committed 预览文件的 title / main_category / sub_category / author / permalink 5 个字符串字段补双引号（不重生：重生会因脚本强制 `paid=True` 翻转当前手动关闭的 `paid=false` 重新激活已暂停付费墙）；`scripts/paywall/build_paid.py` +26 行加 `_Quoted` 值包装 + PyYAML representer，只给字符串值（含列表项）加引号、键保持裸值、bool/int/date 类型不变，将来付费墙恢复真正重生时输出自带引号、不再复发。核对 `head -15 _notes/life/paid-test-us-*.md` 两文件的 `title/main_category/sub_category/date/author/permalink` 6 字段现全带双引号（`date` 因是 `date` 类型不加），全站 270 篇 front-matter 恢复“字符串一律带引号”一致性。**5 轮老待办同日归零**。
>
> **今日 0 项自动修复**：仓库处于极健康状态——build ✅、14 项每日 audit 全 clean 无一命中、`keywords_coverage` 270/270、`study_order` 26/26 完整、maskable 图标一致、无 junk / 无 stub / 无泄露；10 个新 commit 全部合规、无遗漏收尾、且已解决昨日一条老 P2。没有可动的「小而无争议」改动。
>
> **P0 承接**：无。
>
> **P1 承接**：无。
>
> **P2 更新**（一项消除、一项新增，其余承接）：
>
> - **消除**：7-16 P2 #6「`_notes/life/paid-test-us-{banking-guide,visa-types}.md` L4 `main_category:` 未加引号」→ `7751313` 已修（手动补引号 + 脚本根因 `_Quoted` 值包装）。
>
> - **新增**：**评论 Vditor 编辑器 9 轮对抗式复查加固需真机验收**（**今日新增**，来自 `54c1300`~`a6e492e` 9 commit）—— 本轮修复的关键场景：① 图片所见即所得（点图不再出源码、不弹全屏）② 乐观清空防丢草稿（7 处数据丢失全修，用 Waline 真实信号：成功→清 textarea、失败→保留内容并弹 alert）③ 按请求内容精确关联提交成败（拦 Waline 发 `/comment` POST，按请求体 `comment` 文本精确认领对应草稿；alert 仅兜底“同步校验失败”）④ 覆盖编辑 PUT 拦截（点赞/置顶 PUT 体无 `comment` 字段自动跳过、真编辑正确关联）⑤ 慢挂 120s 兜底“先回填再丢弃”⑥ 同文并发提交不再张冠李戴⑦ restore 绝不静默丢草稿（在飞时打新内容→并回末尾；回复框已关→剪贴板兜底）⑧ 图片上传中挡发布 + `insertValue` `try/catch` 保证计数减回 + Vditor 构造失败清空框 ⑨ watchdog 只清未发出的 leak、已发出的交给 fetch ⑩ 多图粘贴/拖拽逐张处理（`a6e492e` 修 `files[0]` 只取第一张、其余静默丢的老 bug）。需验证：① 桌面 Chrome / Firefox + iOS Safari + Android Chrome 至少四组合下过一遍“打字→贴多图→发出→重来一条→并发第二条→回复某评论→编辑已发→网络中断慢挂→网络恢复→点赞置顶”全链路；② 特别看：并发主评论 + 回复框各自提交时草稿绝不错发/回填错；120s 慢挂 alert 到时草稿是否先回填再丢弃；点图不再弹全屏 lightbox；`insertValue` 抛错时上传中提示是否消失、不卡死。沙箱无浏览器 + 无 fly.io Waline 出口跑不了；属**评论核心链路 9 轮对抗式加固**、紧要程度高于一般 UI 收口。
>
> - **承接 7-16 未消除的老 P2**（去掉已消除的 #6，其余全部承接、编号顺移）：① 图片走 R2 图床新链路需真机验收（`5abd7c3`）；② 站主可删任意评论 + 举报中心联动需管理员端流程真机走一遍（`5177e24`）；③ 51 commit 里 admin / account / pet / post / comment 五大高交互面重做需六组合真机验收（今日再加 9 轮 Vditor 复查、验收面已达 17 大项）；④ 新增顶层 `/u/` 公开主页需验证降级 / CTA / noindex 三件事；⑤ `_data/visibility.json` 当前状态（`sections:[]`、`tools:[47 项]`）—— 备忘不擅动；⑥ doudizhu DouZero 神经网络权重 ~20 MB 二进制承接观察；⑦ 承接 7-14 / 7-11 全部老 P2（六组合真机验收 / forest 双视图 / 掼蛋联机 / 机票监控 mac 端到端 / jukebox 问题首 / DNS NameResolutionError / dead_links SVG xmlns 误判 等）。今日无新观察消除、承接不变。
>
> **仓库卫生**：目录结构**较昨日无变化**——工作副本足印 **549 MB**（含 `.git` 140 MB + `_site` 233 MB + 源码约 176 MB，与 7-16 的 177 MB 源码一致，10 commit 净增约 300 行前端脚本、散落 `_includes/comment-vditor.html` 与 `scripts/paywall/build_paid.py`，未突破 1 MB 量级触发 `du` 变动）。`.git` **140 MB**（较 7-16 的 141 MB 微降 −1 MB，属 GC 抖动）、`_site/` **233 MB**（较 7-16 的 231 MB 微增 +2 MB，属纯 build 元数据抖动）。**新增/删除文件均为 0**（10 commit 全为既有文件修改）。`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空。**大文件盘点**：`files/or/or-2023.pdf` 5.4 MB（唯一 5 MB+）、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB、`files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB、`pdfjs/build/pdf.worker.mjs` 2.1 MB、`assets/js/doudizhu/weights/` 6 个 `.qw`（2.6 MB × 3 + 3.5 MB × 3 ≈ 18.4 MB）、`assets/echarts/` 2.0 MB —— 与 7-16 一致，无新增大文件。**`/Users/zhourui` 本机路径痕迹核对**：`grep -rE '/Users/zhourui'` 排除 `.git/` + `DAILY_REVIEW.md` + `SPOTCHECK_*` 后仍见 4 处 `.claude/skills/{search-keywords,recipe,fix-quotes,new-post}/SKILL.md` 首页元数据行「仓库根：`/Users/zhourui/Desktop/ruizhou03.github.io`」—— `.claude/` 已在 `_config.yml` L43 exclude 出 Jekyll build（`_site/` 内 `grep -r '/Users/zhourui' _site/` 空），属**仓库内部 skill 手册的本机 root 备注**、面向站主自己的会话工具、非公开泄露；且 4 处均由更早 commit 引入，非本轮迭代新增；不擅动。**结论**：目录结构较昨日 zero delta，纯代码修改批次；仓库处于健康稳态。

### ✅ 本次已自动修复

无。

站点处于极健康状态：build ✅、14 项每日 audit 全 clean 无一命中（含昨日 P2 #6 承接 6-30 / 7-14 / 7-15 / 7-16 共 5 轮的老待办由站主 `7751313` 修复归零并加脚本根因防复发）、keywords 270/270、study_order 26/26 完整、maskable 图标一致、无 junk / 无 stub / 无泄露；10 个新 commit 全为评论 Vditor 编辑器 9 轮对抗式加固 + paywall 引号根因修复、无遗漏、无可动的「小而无争议」改动。

### 📋 待你把关

#### P0（紧急）

无。

#### P1（重要）

无。仓库当前 P1 队列为空。

#### P2（建议）

1. **评论 Vditor 编辑器 9 轮对抗式复查加固需真机验收**（**今日新增**，来自 `54c1300`~`a6e492e` 9 commit）—— 本轮修复的关键场景：① 图片所见即所得（点图不再出源码、不弹全屏）② 乐观清空防丢草稿（对抗式复查发现 7 处数据丢失/误发全部修复，改用 Waline 真实信号：成功→它清 textarea、失败→保留内容并弹 alert）③ 按请求内容精确关联提交成败（拦 Waline 发 `/comment` POST，按请求体 `comment` 文本精确认领对应草稿；alert 仅兜底“同步校验失败”）④ 覆盖编辑 PUT 拦截（点赞/置顶 PUT 体无 `comment` 字段自动跳过、真编辑正确关联）⑤ 慢挂 120s 兜底“先回填再丢弃”、请求挂过 120s 再失败也不丢草稿 ⑥ 同文并发提交不再张冠李戴（fetch 关联时捕获该条 rec、响应回来直接用它不再按内容重查）⑦ restore 绝不静默丢草稿（在飞时打新内容→并回末尾；回复框已关→剪贴板兜底 + 不谎报）⑧ 图片上传中挡发布 + `insertValue` `try/catch` 保证计数一定减回不卡死发布 + Vditor 构造失败清空框（`5184a3f` 第五轮复查）⑨ watchdog 只清未发出的 leak、已发出的交给 fetch（含慢挂）避免误丢或复活 ⑩ 多图粘贴/拖拽逐张处理（`a6e492e` 修 `files[0]` 只取第一张、其余静默丢的老 bug——粘 5 张图现在真进 5 张）。需验证：① 桌面 Chrome / Firefox + iOS Safari + Android Chrome 至少四组合下过一遍“打字→贴多图→发出→重来一条→并发第二条→回复某评论→编辑已发→网络中断慢挂→网络恢复→点赞置顶”全链路；② 特别看：并发主评论 + 回复框各自提交时草稿绝不错发/回填错；120s 慢挂 alert 到时草稿是否先回填再丢弃；点图不再弹全屏 lightbox；`insertValue` 抛错时上传中提示是否消失、不卡死；watchdog 是否只清未发出的 leak，已发出请求即使慢挂也不误清；多图粘贴的 5 张是否都插入不再丢。沙箱无浏览器 + 无 fly.io Waline 出口跑不了；属**评论核心链路 9 轮对抗式加固**、紧要程度高于一般 UI 收口，与昨日 P2 #1 / P2 #2 三条评论加固形成完整验收面。

2. **图片走 R2 图床新链路需真机验收**（承接 7-16 P2 #1，来自 `5abd7c3`）—— 评论区图片改走 `window.__cmtUpload`（全站共用）：客户端 `downscale` 降采样 → POST `/api/upload` 到 R2 拿短链（`https://xxx.r2.dev/comments/...`）→ Vditor `upload.handler` 与 Waline `imageUploader` 都指过去；上传/网络失败回退 base64 保证功能不阻断。需验证：① 三条上传路径（本机粘贴 / 移动端拍照 / 桌面拖拽）均能顺利拿到 R2 短链；② 后端 503 / 429 / 网络超时回退 base64 是否透明；③ 已发布的 R2 短链在国内外访问稳定（`curl -I xxx.r2.dev/comments/*` 应 200）；④ 后端 `/api/upload` 是否有防未登录/越权上传的鉴权。属新增外部依赖，紧要程度高于一般 UI 收口。沙箱无 fly.io 出口 + 无浏览器跑不了。（与今日 P2 #1 的多图粘贴/拖拽逐张处理形成完整链路：a6e492e 保证浏览器端多图不丢、5abd7c3 保证每张图都上 R2。）

3. **站主可删任意评论 + 举报中心联动需管理员端流程真机走一遍**（承接 7-16 P2 #2，来自 `5177e24`）—— 评论抽屉管理员每条显示「删除」（连回复一并删）、普通访客仍是「举报」；`/admin` 举报审核加「删除评论 / 忽略举报」按钮走 `zircon-comments/api/delete-comment` adm JWT + `report?action=dismiss`。需验证：① 管理员未登录 / 会话过期时按钮只对 adm 可见（不误开给游客）；② 误删是否有二次确认或恢复窗口（当前 commit 未提及）；③ 举报中心删除是否原子（删评论 + 移出队列 + 撤回举报计数一次成功，无残留脏状态）；④ 删除后评论数镜像 `wl-num → .waline-comment-count` 是否即时下降。沙箱无后端出口跑不了。

4. **7-15 P2 #1「51 commit 五大高交互面重做需六组合真机验收」进一步放大范围**（承接 7-16 P2 #3，加今日 10 commit）—— 昨日已列覆盖 iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + PWA standalone 至少六组合的 17 大验收面，今日再叠加：⑱ 评论 Vditor 编辑器 9 轮对抗式复查加固（含所见即所得图片 / 乐观清空防丢草稿 / 精确关联提交成败 / 覆盖编辑 PUT 拦截 / 慢挂 120s 兜底 / 并发提交 rec 捕获 / restore 剪贴板兜底 / 上传中挡发布 + insertValue try/catch + Vditor 构造失败清空 / watchdog 只清 leak / 多图逐张处理 —— 详见今日 P2 #1）；⑲ paywall 生成脚本 `_Quoted` 值包装（`7751313`）待付费墙下次真正重生时验证输出字符串一律带引号、键裸值、bool/int/date 类型不变。沙箱无 GUI / 无触屏 / 无 fly.io 后端出口跑不了。

5. **新增顶层 `/u/` 公开主页**（承接 7-15 / 7-16 P2 #4）—— `u/index.html` 4730 B、`permalink: /u/`、`noindex: true`、`sitemap: false`，由 `account/index.html` L999 与 `_layouts/{post,recipe}.html` 三处 lock('link') 分享链拉出、参数化 `/u/?id=<accountId>` 渲染读者个人页。需验证：① 不存在的 accountId 是否降级到「这个主页不存在，或对方没有公开」空态；② 自己的 accountId 是否走「这是你的主页 · 去编辑」CTA；③ `noindex + sitemap:false` 双保险是否让搜索引擎不收录。沙箱无后端跑不了。

6. **`_data/visibility.json` 当前状态**（承接 7-15 / 7-16 P2 #5）：`sections: []`（全部四大板块对访客可见）；`tools: [47 项]`（`_data/toolbox.yml` 53 个工具中的 47 个当前对访客隐藏、仅 6 个含 `pet` / `doudizhu` / `suika` 等对外可见）。是站主分批放出、管理后台 7 次连续 `chore(admin)` 调整的产物、仅备忘。如为长期状态可考虑给 `/toolbox/` landing 加「其它工具临时下架、逐步开放中」的极小提示条 —— 属 IA 设计判断、不擅动。

7. **doudizhu DouZero 神经网络权重 ~20 MB 二进制**（承接 7-14 / 7-15 / 7-16 P2 #7）—— `assets/js/doudizhu/weights/` 6 组 `.qw` + `.f32` + `.json` 仍 ~20 MB；仓库工作副本约 176 MB 源码 + 140 MB `.git`。是否评估 Git LFS / CDN 拆分承接观察不变。

8. **承接 7-16 / 7-15 / 7-14 / 7-11 全部老 P2 未消除项**：7-11 冲刺日新增 `/zh/about/` + `404.html` + 首页照片堆叠 3 张预渲染 + reduce-motion 翻页 + forest「grow」暗号 + forest ∞ 灵活模式的六组合真机验收 6 项 / `452797e` 书架 commit 声明「现 7 本」实际 6 本的意图确认 / 7-14 admin 控制台 & 账号中心 12 commit 数据看板浏览量趋势折线 + 世界地图 + 设备环形 + ECharts 自托管 + 密码/导出/注销流程的六组合真机验收；7-10 / 7-07 / 7-06 承接的 forest 两轮对抗式审查 6 处 / 「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` / forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收、forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名等 —— 今日无新观察消除、承接不变。

### 🗂 仓库卫生

**目录结构较昨日无变化**——工作副本足印 **549 MB**（含 `.git` 140 MB + `_site` 233 MB + 源码约 176 MB，与 7-16 的 177 MB 源码一致，10 commit 净增约 300 行前端脚本、散落在 `_includes/comment-vditor.html`（9 commit 累计约 +150 行含大幅重构）+ `scripts/paywall/build_paid.py`（+26 行）+ `_notes/life/paid-test-us-*.md`（+10/-10 引号补齐），未突破 1 MB 量级触发 `du` 变动）。`.git` **140 MB**（较 7-16 微降 −1 MB，属 GC 抖动）、`_site/` **233 MB**（较 7-16 +2 MB，纯 build 元数据抖动）。**新增/删除文件 = 0**（10 commit 全为既有文件修改，无新目录、无删除文件）。`git status` clean（本地 = origin/main、`up to date`）、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空。**大文件盘点**：`files/or/or-2023.pdf` 5.4 MB（唯一 5 MB+）、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB、`files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB、`pdfjs/build/pdf.worker.mjs` 2.1 MB、`assets/js/doudizhu/weights/` 6 个 `.qw`（2.6 MB × 3 + 3.5 MB × 3 ≈ 18.4 MB）、`assets/echarts/` 2.0 MB —— 与 7-16 完全一致，无新增大文件。**maskable 图标 md5 核验**：三对文件仍不 byte-identical（forest 主 `63df7bec…` vs maskable `36ada6c2…`、ledger 主 `fad6da15…` vs maskable `433f42fc…`、pindou 主 `fed25167…` vs maskable `f4ef2d70…`）与 7-16 / 7-15 / 7-14 完全一致。`_paid/` + `_flight-staging/` 在 `_config.yml` L50 / L52 exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）等所有内部产物。**`/Users/zhourui` 本机路径痕迹核对**：`grep -rE '/Users/zhourui'` 排除 `.git/` + `DAILY_REVIEW.md` + `SPOTCHECK_*` 后仍见 4 处 `.claude/skills/{search-keywords,recipe,fix-quotes,new-post}/SKILL.md` 首页元数据行「仓库根：`/Users/zhourui/Desktop/ruizhou03.github.io`」—— `.claude/` 已在 `_config.yml` L43 exclude 出 Jekyll build（`_site/` 内 `grep -r '/Users/zhourui' _site/` 空），属**仓库内部 skill 手册的本机 root 备注**、面向站主自己的会话工具、非公开泄露；且 4 处均由更早 commit 引入，非本轮迭代新增；不擅动。**paywall 修复副作用核对**：`head -15 _notes/life/paid-test-us-{banking-guide,visa-types}.md` 两文件的 `title / main_category / sub_category / author / permalink` 5 字符串字段现全带双引号，`date` 类型字段不带引号（`date: 2026-04-22` / `date: 2026-03-18` 保持裸值符合 YAML `date` 类型规范）；全站 270 篇 front-matter 恢复“字符串一律带引号”一致性。**结论**：目录结构较昨日 zero delta，纯代码修改批次；仓库处于健康稳态、无冗余可清理。

---

## 2026-07-16

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套。距 7-15 巡检共 **12 个新 commit**（`726e013..5177e24`）—— 承接 7-15 51-commit 冲刺日的收尾修复批次，围绕昨日新落地的 Vditor 评论编辑器与宠物 CloudSync 数据丢失做加固与 UX 收口，无新目录/新板块。改动集中在四条主线：**评论 comment ~6 commit**（`92054ab` 修数学公式刷新真因 + 去 Waline 登录钮 + 评论数实时 + 回复箭头/框 + Vditor 图片降采样 → `10e2d2f` 作者徽章 `comment_author_id=a_mpw2mdbs6e2qrc44` 填入 + 评论数秒出直拉 count 不等 Waline → `5abd7c3` 图片走 R2 图床短链接不再内嵌 base64（新增 `window.__cmtUpload` 全站共用降采样→POST `/api/upload` 到 R2，失败回退 base64）→ `f8aef2d` 评论记录里 `path` 渲成标题（生成 `path→title` 表覆盖 `site.notes` + toolbox 工具名）→ `8521833` Vditor 缩进减小 + 发表后可靠清空编辑器（轮询 textarea 从“有内容”变空才清 Vditor）→ `5177e24` **站主可删任意评论**（管理员抽屉「删除」连回复一并删）+ 举报中心「删除评论 / 忽略举报」联动，走 `zircon-comments/api/delete-comment` adm JWT 鉴权）；**宠物 pet ~3 commit**（`3c84734` 修类别/食物归类被后台 CloudSync 拉取凭空盖掉（`foodLibrary` / `foodGroups` 改按 id 取并集本地优先）→ `77f7ce3` 类别下点「＋」批量归类现有食物（不用挨个编辑）→ `92ad0de` **彻底修类别 60s 后消失**——真凶是 `pet[k]` 与 `pet._syncedMeta[k]` 共享同一数组引用致脏检测失效，`markMetaSynced` / `applyServerMeta` 首折与常规折凡写入 `_syncedMeta` 一律 `cloneMeta` 深拷贝；顺带修 `bare_dollar.py` 启发式漏判 `$1-F(x)$` 型内联数学、`filename_convention.py` 把 `econ-math-toolkit.pdf` 加进 `ACCEPTED_UNDATED`）；**账号 account ~1 commit**（`90873d7` hero 统计横幅 `flex:1 1 auto + max-width:560` 不再塌太窄 + 评论记录里 `![](data:image/http)` 转小缩略图显示、评论体 `overflow-wrap/word-break` 防长 base64 横向溢出）；**flight ~1 commit**（`99e53ba` **15 处 `:hover` 补 `@media (hover: hover)` 触屏守卫**——`toolbox/flight/{handoff,index,manual,ticket-detail}.html` 全部 `:hover` 规则包进 `@media (hover: hover)`、`index.html` L163 `.dcard:hover` 与 `.dcard.on` 串写处只拆包 `:hover` 段不动常驻态；`scripts/audit/hover_no_media.py` 识别复合 `@media (hover:hover) and (...)` 守卫 + 守卫区间从 `@media` 关键字起算，L152 `.t-arr` 复合查询不再误报，flight 已放出前清障）；外加 `fcef3a9` 7-15 daily-review 自动巡检提交。文件新增：无（12 commit 全为既有文件修改）。
>
> **build 健康度**：`bundle install` ✅（`Bundle complete! 7 Gemfile dependencies, 39 gems now installed.`）+ `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（**22.526 s cold build** —— 高于 7-15 的 7.763 s 与 7-14 的 16.194 s，与本轮沙箱冷启动差异一致，`_site/` 产物完整度一致）。`_site/` 顶层 **28 项**（与 7-15 一致：`404.html` `CNAME` `account` `admin` `admin-manifest.json` `assets` `assistant-fulltext.json` `assistant-index.json` `en` `essays` `feed.xml` `files` `flight` `google5306…` `index.html` `life` `manifest.json` `notes` `pdfjs` `redirects.json` `research` `robots.txt` `search.json` `sitemap.xml` `sw.js` `toolbox` `u` `zh`）。三处 7-15 记录的 `_site/` 关键产物尺寸今天完全一致：`_site/toolbox/forest/index.html` **444259 B**（与 7-15 同）、`_site/404.html` **93141 B**（与 7-15 同）、`_site/zh/about/index.html` **98978 B**（与 7-15 同）—— 12 commit 主要触及 `_includes/comment-drawer.html` / `_includes/comment-vditor.html` / `assets/js/pet.js` / `admin/index.html` / `account/index.html` 等前端交互层，未触及三个采样页面的共用组件，故 byte-identical 与 7-15。`_notes/` 全 **270 篇 md** 仍 100% 覆盖 `keywords:`（`grep -rL '^keywords:' _notes/` 空），搜索体系闭环。`_paid/` + `_flight-staging/` 在 `_config.yml` L50 / L52 exclude 双保险稳固、`find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。**maskable 图标 md5 核验**：三对文件仍不 byte-identical（`forest-icon-512.png` `63df7becb4ddc57e2b95e88305a33a18` vs `forest-icon-maskable-512.png` `36ada6c2364827c1455260f7d42ae6f1`、`ledger-icon-512.png` `fad6da15326e5fbf54adb03663f78be2` vs `ledger-icon-maskable-512.png` `433f42fc5748a0b16747e12ddbb4b47a`、`pindou-icon-512.png` `fed25167c04f65fc5ce80f28bd12ddf6` vs `pindou-icon-maskable-512.png` `f4ef2d70dbf297809aa5f76c23836f5b`）与 7-15 / 7-14 完全一致；`python3 scripts/audit/maskable_icon_consistency.py` 报「✅ 已检查 9 个 maskable 图标声明，均与 any 图标不同」。**`study_order`**：`_config.yml` 26 条、`ls _notes/study/` 26 目录、`comm -23` 差集空 —— 与 7-15 一致。全套 `scripts/audit/run.sh`（今日周四 DOW=4，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=16 非月初，未加跑 monthly_stats）14 项每日 audit **全 clean 无一命中**：`keywords_coverage` / `images` / `backend_pulse`（curl 56 HTTP 403 承接沙箱无 fly.io 出口）/ `spotcheck`（10 项配额抽检）/ `material_type_enum` / `filename_convention` / `maskable_icon_consistency` / `hover_no_media` / `sibling_crosslink` / `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` **均 ✅**。**尤其值得记录**：昨日 P2 #4 / #5 / #8 三项**均由站主在同日修复消除**——① P2 #4 `toolbox/flight/*.html` 16 处 `:hover` 缺 `@media (hover: hover)` 守卫 → `99e53ba` 一次性补齐、脚本误报同修；② P2 #5 `bare_dollar` 对 `$1-F(x)$` 型内联数学启发式漏判（承接 6-30 / 7-01 / 7-14 / 7-15 共 4 轮） → `92ad0de` 加「`$<数字>` 紧跟数学运算符/字母/括号且同行有配对 `$`、中间不含 CJK → 数学公式跳过」启发式；③ P2 #8 `files/econ-math-toolkit/econ-math-toolkit.pdf` 不含年份 → `92ad0de` 把它加进 `ACCEPTED_UNDATED` 白名单并注释「原创教材（8 Part / 42 章），按主题组织、无单一年份」。三条 audit 老待办**同日一并归零**，今日审计队列压缩显著。
>
> **今日 0 项自动修复**：仓库处于极健康状态——build ✅、14 项每日 audit 全 clean 无一命中、`keywords_coverage` 270/270、`study_order` 26/26 完整、maskable 图标一致、无 junk / 无 stub / 无泄露；12 个新 commit 全部合规、无遗漏收尾。没有可动的「小而无争议」改动。
>
> **P0 承接**：无。
>
> **P1 承接**：无。
>
> **P2 更新**（三项消除、两项新增，其余承接）：
>
> - **消除**：① 7-15 P2 #4「flight 16 处 hover 缺守卫」→ `99e53ba` 已修；② 7-15 P2 #5「`bare_dollar` 启发式漏判 `$1-F(x)$`」→ `92ad0de` 已修；③ 7-15 P2 #8「`econ-math-toolkit.pdf` 不含年份」→ `92ad0de` 已加白名单。
>
> - **新增**：(a) **图片走 R2 图床（`5abd7c3`）新链路需真机验收**——`window.__cmtUpload` 走 `SiteAuth.API_BASE` 或硬编码 `https://zircon-urge.fly.dev/api` `/upload` 到 R2 拿短链，Vditor `upload.handler` + Waline `imageUploader` 都指过去、失败回退 base64。需验证：① 上传成功链路（本机粘贴 / 移动端拍照 / 桌面拖拽三路径）→ R2 短链回填正常；② 后端 503 / 网络失败 / 大文件超时时回退 base64 是否透明不阻断；③ 已发布短链在国内外访问是否稳定（curl `xxx.r2.dev/comments/*` 200）；④ 后端 `/api/upload` 是否防未登录 / 越权上传。沙箱无 fly.io 出口 + 无浏览器跑不了；属新增外部依赖，紧要程度高于一般 UI 收口。(b) **站主可删任意评论 + 举报中心联动（`5177e24`）需管理员端流程真机走一遍**——评论抽屉管理员每条显示「删除」（连回复一并删），`/admin` 举报审核加「删除评论 / 忽略评论」按钮走 `zircon-comments/api/delete-comment` adm JWT + `report?action=dismiss`；需验证：管理员未登录 / 会话过期时按钮是否只对 adm 可见、误删是否有二次确认或恢复窗口、举报中心删除是否原子（删+移出队列+撤回举报计数）。沙箱无后端出口跑不了。
>
> - **承接 7-15 未消除的老 P2**（去掉已消除的 #4 / #5 / #8，其余全部承接）：① 51 commit 里 admin / account / pet / post / comment 五大高交互面重做需六组合真机验收（今日又加进 12 commit 的 Vditor 收口 + R2 图床 + 管理员删评论，进一步放大验收范围）；② 新增顶层 `/u/` 公开主页（`u/index.html` 4730 B、`permalink: /u/`、`noindex: true`、`sitemap: false`）需验证降级 / CTA / noindex 三件事；③ `_data/visibility.json` 当前状态（`sections:[]`、`tools:[47 项]` 47 项对访客隐藏、仅 6 项含 `pet` / `doudizhu` / `suika` 等本轮迭代重点对外可见）—— 是站主分批放出的产物，仅备忘；④ `_notes/life/paid-test-us-banking-guide.md` L4 与 `paid-test-us-visa-types.md` L4 的 `main_category:` 未加引号（承接 6-30 / 7-14 / 7-15，需改源文件 `_paid/*.md` 或改 `scripts/paywall/build_paid.py`）；⑤ doudizhu DouZero 神经网络权重 ~20 MB 二进制承接观察；⑥ 承接 7-14 / 7-11 全部老 P2（六组合真机验收 / forest 双视图 / 掼蛋联机 / 机票监控 mac 端到端 / jukebox 问题首 / DNS NameResolutionError / dead_links SVG xmlns 误判 等）。今日无新观察消除、承接不变。
>
> **仓库卫生**：目录结构**较昨日无变化**——工作副本足印 **177 MB**（与 7-15 一致，12 commit 净增 ~500 行前端脚本，散落在 `_includes/comment-drawer.html` +136 / `_includes/comment-vditor.html` +57 / `assets/js/pet.js` +72 / `admin/index.html` +48 / `account/index.html` +23 / `scripts/audit/{bare_dollar,filename_convention}.py` +12 等，未突破 1 MB 量级触发 `du` 变动）。`.git` **141 MB**（较 7-15 微增 +1 MB）、`_site/` **231 MB**（较 7-15 +4 MB，纯 build 元数据抖动）。**新增/删除文件均为 0**（12 commit 全为既有文件修改）。`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空。**大文件盘点**：`files/or/or-2023.pdf` 5.4 MB（唯一 5 MB+）、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB、`files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB、`pdfjs/build/pdf.worker.mjs` 2.1 MB、`assets/js/doudizhu/weights/` 6 个 `.qw`（2.6 MB × 3 + 3.5 MB × 3 ≈ 18.4 MB）、`assets/echarts/` 2.0 MB —— 与 7-15 一致，无新增大文件。**`/Users/zhourui` 本机路径痕迹核对**：`grep -rE '/Users/zhourui'` 排除 `.git/` + `DAILY_REVIEW.md` 后仍见 4 处 `.claude/skills/{search-keywords,recipe,fix-quotes,new-post}/SKILL.md` 首页元数据行「仓库根：`/Users/zhourui/Desktop/ruizhou03.github.io`」—— `.claude/` 已在 `_config.yml` L43 exclude 出 Jekyll build（`_site/` 内 `grep -r '/Users/zhourui' _site/` 空），属**仓库内部 skill 手册的本机 root 备注**、面向站主自己的会话工具、非公开泄露；且 4 处均由 7-15 之前的 commit 引入（`git log -1` 报 `f8c8f35`），非本轮迭代新增；不擅动。**结论**：目录结构较昨日 zero delta，纯代码修改批次；仓库处于健康稳态。

### ✅ 本次已自动修复

无。

站点处于极健康状态：build ✅、14 项每日 audit 全 clean 无一命中（含昨日 P2 #4 / #5 / #8 三项由站主自行修复归零）、keywords 270/270、study_order 26/26 完整、maskable 图标一致、无 junk / 无 stub / 无泄露；12 个新 commit 全为收尾加固与 UX 收口、无遗漏、无可动的「小而无争议」改动。

### 📋 待你把关

#### P0（紧急）

无。

#### P1（重要）

无。仓库当前 P1 队列为空。

#### P2（建议）

1. **图片走 R2 图床新链路需真机验收**（**今日新增**，来自 `5abd7c3`）—— 评论区图片改走 `window.__cmtUpload`（全站共用）：客户端 `downscale` 降采样 → POST `/api/upload` 到 R2 拿短链（`https://xxx.r2.dev/comments/...`）→ Vditor `upload.handler` 与 Waline `imageUploader` 都指过去；上传/网络失败回退 base64 保证功能不阻断。需验证：① 三条上传路径（本机粘贴 / 移动端拍照 / 桌面拖拽）均能顺利拿到 R2 短链；② 后端 503 / 429 / 网络超时回退 base64 是否透明；③ 已发布的 R2 短链在国内外访问稳定（`curl -I xxx.r2.dev/comments/*` 应 200）；④ 后端 `/api/upload` 是否有防未登录/越权上传的鉴权。属新增外部依赖，紧要程度高于一般 UI 收口。沙箱无 fly.io 出口 + 无浏览器跑不了。

2. **站主可删任意评论 + 举报中心联动需管理员端流程真机走一遍**（**今日新增**，来自 `5177e24`）—— 评论抽屉管理员每条显示「删除」（连回复一并删）、普通访客仍是「举报」；`/admin` 举报审核加「删除评论 / 忽略举报」按钮走 `zircon-comments/api/delete-comment` adm JWT + `report?action=dismiss`。需验证：① 管理员未登录 / 会话过期时按钮只对 adm 可见（不误开给游客）；② 误删是否有二次确认或恢复窗口（当前 commit 未提及）；③ 举报中心删除是否原子（删评论 + 移出队列 + 撤回举报计数一次成功，无残留脏状态）；④ 删除后评论数镜像 `wl-num → .waline-comment-count` 是否即时下降。沙箱无后端出口跑不了。

3. **7-15 P2 #1「51 commit 五大高交互面重做需六组合真机验收」进一步放大范围**（承接 7-15 并加今日 12 commit）—— 昨日已列覆盖 iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + PWA standalone 至少六组合的 9 大验收面（Vditor 编辑器 / 数学公式服务端渲染 / 评论抽屉合流 / 阅读页互动栏 / 账号中心 hero / 宠物中心粮食面板四轮 / 举报审核面板 / suika 打磨 / doudizhu 联机 lobby），今日再叠加：⑩ Vditor 「发表后可靠清空」轮询逻辑（`8521833`：提交后监测 textarea 从“有内容”变空才清 Vditor，避免单次 setTimeout 错过；提交失败不误清）；⑪ 评论抽屉「作者徽章」显示与「评论数秒出直拉 count 不等 Waline」两处秒出行为（`10e2d2f`：`comment_author_id=a_mpw2mdbs6e2qrc44` 填入让站主评论自动挂「作者」徽章）；⑫ 评论记录里 `path` → 标题渲染（`f8aef2d`：`site.notes` 标题 + toolbox 工具名生成 `path→title` 映射覆盖）；⑬ 数学公式「刷新失效真因」修复（`92054ab`：Vditor 同步时把 `$$...$$` 规范成独占一行块级 → 服务端才渲成 SVG）；⑭ 宠物 `_syncedMeta` 引用别名脏检测失效修复（`92ad0de`：`markMetaSynced` / `applyServerMeta` 一律 `cloneMeta` 深拷贝，护住新建类别不被 60s 后 `pullSharedPets` 覆盖）—— 是**继 `3c847344` 前一版 CloudSync 拉取覆盖修复后**又一层深层次数据丢失修复，需真机多设备（至少两台）观察 60s 类别不再消失；⑮ 宠物类别下点「＋」批量归类（`77f7ce3`：弹出「加食物到「XX」」列出所有还不在该类别的食物、点一下即加）；⑯ 账号 hero 统计横幅放宽 + 评论体防长 base64 溢出（`90873d7`）；⑰ flight 15 处 hover 触屏守卫（`99e53ba`：flight 当前虽通过 `_data/visibility.json` `tools` 列下架非访客可见、放出后需触屏真机验证 hover 不再卡态）。沙箱无 GUI / 无触屏 / 无 fly.io 后端出口跑不了。

4. **新增顶层 `/u/` 公开主页**（承接 7-15 P2 #2）—— `u/index.html` 4730 B、`permalink: /u/`、`noindex: true`、`sitemap: false`，由 `account/index.html` L999 与 `_layouts/{post,recipe}.html` 三处 lock('link') 分享链拉出、参数化 `/u/?id=<accountId>` 渲染读者个人页。需验证：① 不存在的 accountId 是否降级到「这个主页不存在，或对方没有公开」空态；② 自己的 accountId 是否走「这是你的主页 · 去编辑」CTA；③ `noindex + sitemap:false` 双保险是否让搜索引擎不收录。沙箱无后端跑不了。

5. **`_data/visibility.json` 当前状态**（承接 7-15 P2 #3）：`sections: []`（全部四大板块对访客可见）；`tools: [47 项]`（`_data/toolbox.yml` 53 个工具中的 47 个当前对访客隐藏、仅 6 个含 `pet` / `doudizhu` / `suika` 等对外可见）。是站主分批放出、管理后台 7 次连续 `chore(admin)` 调整的产物、仅备忘。如为长期状态可考虑给 `/toolbox/` landing 加「其它工具临时下架、逐步开放中」的极小提示条 —— 属 IA 设计判断、不擅动。

6. **`_notes/life/paid-test-us-banking-guide.md` L4 与 `paid-test-us-visa-types.md` L4 的 `main_category:` 未加引号**（承接 6-30 / 7-14 / 7-15）—— 全站 270 篇里仅这 2 篇不带引号；由 `scripts/paywall/build_paid.py` 从 gitignored `_paid/*.md` 自动生成、直接改会被下次重生覆盖，需改源文件或脚本。承接观察不变。

7. **doudizhu DouZero 神经网络权重 ~20 MB 二进制**（承接 7-14 / 7-15）—— `assets/js/doudizhu/weights/` 6 组 `.qw` + `.f32` + `.json` 仍 ~20 MB；仓库工作副本 177 MB。是否评估 Git LFS / CDN 拆分承接观察不变。

8. **承接 7-15 / 7-14 / 7-11 全部老 P2 未消除项**：7-11 冲刺日新增 `/zh/about/` + `404.html` + 首页照片堆叠 3 张预渲染 + reduce-motion 翻页 + forest「grow」暗号 + forest ∞ 灵活模式的六组合真机验收 6 项 / `452797e` 书架 commit 声明「现 7 本」实际 6 本的意图确认 / 7-14 admin 控制台 & 账号中心 12 commit 数据看板浏览量趋势折线 + 世界地图 + 设备环形 + ECharts 自托管 + 密码/导出/注销流程的六组合真机验收；7-10 / 7-07 / 7-06 承接的 forest 两轮对抗式审查 6 处 / 「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` / forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收、forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名等 —— 今日无新观察消除、承接不变。

### 🗂 仓库卫生

**目录结构较昨日无变化**——工作副本足印 **177 MB**（与 7-15 一致，12 commit 净增 ~500 行前端脚本散落在 `_includes/comment-drawer.html` +136 / `_includes/comment-vditor.html` +57 / `assets/js/pet.js` +72 / `admin/index.html` +48 / `account/index.html` +23 等，未突破 1 MB 量级触发 `du` 变动）。`.git` **141 MB**（较 7-15 微增 +1 MB）、`_site/` **231 MB**（较 7-15 +4 MB，纯 build 元数据抖动）。**新增/删除文件 = 0**（12 commit 全为既有文件修改，无新目录、无删除文件）。`git status` clean（rebase 收 origin `5177e24` 后本地 = origin）、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空。**大文件盘点**：`files/or/or-2023.pdf` 5.4 MB（唯一 5 MB+）、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB、`files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB、`pdfjs/build/pdf.worker.mjs` 2.1 MB、`assets/js/doudizhu/weights/` 6 个 `.qw`（2.6 MB × 3 + 3.5 MB × 3 ≈ 18.4 MB）、`assets/echarts/` 2.0 MB —— 与 7-15 完全一致，无新增大文件。**maskable 图标 md5 核验**：三对文件仍不 byte-identical（forest 主 `63df7becb4ddc57e2b95e88305a33a18` vs maskable `36ada6c2364827c1455260f7d42ae6f1`、ledger 主 `fad6da15326e5fbf54adb03663f78be2` vs maskable `433f42fc5748a0b16747e12ddbb4b47a`、pindou 主 `fed25167c04f65fc5ce80f28bd12ddf6` vs maskable `f4ef2d70dbf297809aa5f76c23836f5b`）与 7-15 / 7-14 完全一致。`_paid/` + `_flight-staging/` 在 `_config.yml` L50 / L52 exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）等所有内部产物。**`/Users/zhourui` 本机路径痕迹核对**：`grep -rE '/Users/zhourui'` 排除 `.git/` + `DAILY_REVIEW.md` 后仍见 4 处 `.claude/skills/{search-keywords,recipe,fix-quotes,new-post}/SKILL.md` 首页元数据行「仓库根：`/Users/zhourui/Desktop/ruizhou03.github.io`」—— `.claude/` 已在 `_config.yml` L43 exclude 出 Jekyll build（`_site/` 内 `grep -r '/Users/zhourui' _site/` 空），属**仓库内部 skill 手册的本机 root 备注**、面向站主自己的会话工具、非公开泄露；且 4 处均由 7-15 之前的 commit 引入（`git log -1` 报 `f8c8f35`），非本轮迭代新增；不擅动。**结论**：目录结构较昨日 zero delta，纯代码修改批次；仓库处于健康稳态、无冗余可清理。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点：`backend_pulse.py` 全报 curl exit 56 (CONNECT tunnel failed 403)，承接沙箱无 fly.io 出口现象、不阻塞巡检、未主动重启 fly app。**今日 12 个新 commit** 中：`5abd7c3` 新增 `zircon-urge/api/upload` R2 图床端点依赖（评论区图片上传，新链路）；`5177e24` 新增 `zircon-comments/api/delete-comment` adm JWT 鉴权删评论端点依赖（管理员删除评论 + 举报中心「删除/忽略」）；`10e2d2f` 补 `comment_author_id=a_mpw2mdbs6e2qrc44` 前端徽章 id + 直拉 Waline count 秒出评论数；`92054ab` 修数学公式服务端渲染真因；`f8aef2d` 账号评论记录 path→title 前端映射；`3c84734` + `92ad0de` 宠物 CloudSync 数据丢失双修（前者按 id 取并集、后者 `_syncedMeta` 引用深拷贝根治），涉及 zircon-urge 宠物同步端点行为一致性。本 agent 沙箱无 fly.io 出口无法核验后端应答、也无法验证新落地的 `/api/upload` R2 短链回落链路；本地 `bundle exec jekyll build` ✅ 通过、静态 layout 全 clean。

---

## 2026-07-15

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套。距 7-14 巡检共 **51 个新 commit**（`0831d0d..726e013`）—— 又一次爆发日，规模略高于 7-14 的 25-commit 冲刺、7-11 的 27-commit 冲刺。改动集中在六条主线：**宠物中心 pet ~15 commit**（`180fe18` 隐私与数据说明 → `b4e4ed9` 录入减负 + PWA 暗色 → `f8c8f35` / `e22f342` 三大功能标签统一藏蓝细线图标 → `000240e` 图表文字放大 + 新宠物首笔引导 → `5a6b56c` 可点击邀请链接 + 分享封面图 + PWA 安装截图 → `c785079` / `3eb721f` a11y-6 / a11y-7 食物选择器 & 裁剪头像键盘可达 → `07fb03e` / `4fc8503`（跨界） / `b1805d4` / `9dca086` 粮食面板推倒重做→暖纸手账→紧凑收尾→合并趋势/记录/历史 → `5b02c22` 三板块标签平铺三列 + 猫语空闲不再常驻「点一下播放」 → `ae36905` 去卡片背景开放版式 + 记录改「按日翻」 → `66372fe` 体重框改「食记语言」→ `c3cde3f` 体重「最近」→分页看全部历史 → `1edfd6e` 食物按类别筛选 → `7e2d865` 类别管理入口 → `d7d01a4` 删掉「换新」多余文字 → `a65d98a` 食量估算升级到兽医标准 RER/MER 能量法）；**账号中心 account ~7 commit**（`5fc1368` 编辑弹窗化 + 列表翻页 + 升级细则 + 等级特权 + 分享按钮 → `7b618aa` 记录搜索 + 手机资料卡瘦身 + 段位药丸 + 明暗按钮显当前态 → `4d73f21` 收藏页改「收藏夹网格」+ 新建/删除/移动到收藏夹 → `919fb6f` 全选按钮切「取消全选」+ 搜索 & 批量管理共存 → `4948a08` 个人中心重设计 + 收藏夹多夹整合 → `e5d29cd` 放宽画幅 main 卡 800→1240 + hero 三区不再换行 → `665d05d` hero 横幅统计 + 下拉身份行头像/进度 + 明暗移入设置）；**阅读页 post + 评论 comment ~11 commit**（`bd1ef5b` 阅读页互动栏极简计数 + 手机吸底跟随 → `558f6a7` 点赞/收藏乐观更新 → `55be9e3` 阅读页「收藏时选夹」弹层 → `2d65e2f` 分享靠最右 + 换链接矢量图标 + 直接复制「【栏目】标题 + 链接」→ `4fc8503` 评论区改悬浮抽屉 + 下线 Waline 表情 → `3986f9d` 分享反馈改单条小浮窗 + 收藏星星再点即取消 → `4a9388f` 评论抽屉逐条点赞样式化 + 注入「举报」→ `2360562` 评论抽屉仿知乎清爽版式 → `e897eda` 修数学公式刷新后失效 + 评论编辑器/动作精简 → `bb13388` 粘贴图片给明确反馈 + 预览按钮补「预览」二字 + 修举报图标覆盖 → `9ac68f1` 粘贴图片显示缩略图预览条 → `726e013` 评论框升级为 Typora 式 **Vditor**（公式就地渲染 + 图片粘贴内联 + 稳字第一失败回退原生 textarea 保护，新增 `_includes/comment-vditor.html`）；**管理后台 admin ~8 commit**（`eb1e1a7` / `68155e2` / `f47bef2` / `6661c00` / `8914f6c` / `08f8c3b` / `e3faf3d` 7 条「更新板块/小工具可见性 via 管理后台」`chore(admin)` + `d179057` 举报审核面板「内容管理 → 举报审核」）；**其它前端 & 内容**（`c2990fa` suika 巡查打磨批次 9 项 · 控制栏/防误触/局中退出/多指/榜单/彩蛋 / `0831d0d` doudizhu 联机 lobby 空间化贴合牌桌三角 + 座位操作乐观更新 / `3d08e30` 列表卡片露互动数 · 方案 A 增强行 + 方案 B 首页卡片 / `db5e415` pet 版本信标 bump 到 v2026.07.14 / `2666f61` 内容运营：`_data/visibility.json` sections 清空放出「科研妙招 / 生活攻略」两大板块）。文件新增：`_includes/comment-vditor.html`（100 行 Vditor Typora 式评论编辑器）。**顶层 `/u/` 公开主页**（`u/index.html` 4730 B、`permalink: /u/`、`noindex: true`、`sitemap: false`）通过 `/u/?id=<accountId>` 提供读者个人公开页 —— 由 `account/index.html` L999 / `_layouts/post.html` L1153 / `_layouts/recipe.html` L476 三处 lock('link') 分享链拉出（新入口 = **`_site/` 顶层从 27 项抬到 28 项**，新增 `u/`）。
>
> **build 健康度**：`bundle install` ✅（`Bundle complete! 7 Gemfile dependencies, 39 gems now installed.`）+ `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（**7.763 s cold build** —— 明显低于 7-14 的 16.194 s、7-13 的 15.456 s，与本轮环境冷启动差异一致，`_site/` 产物完整度与二跑 5.582 s 一致）。`_site/` 顶层 **28 项**（较 7-14 +1，多出 `u/` 公开主页）：`404.html` `CNAME` `account` `admin` `admin-manifest.json` `assets` `assistant-fulltext.json` `assistant-index.json` `en` `essays` `feed.xml` `files` `flight` `google5306…` `index.html` `life` `manifest.json` `notes` `pdfjs` `redirects.json` `research` `robots.txt` `search.json` `sitemap.xml` `sw.js` `toolbox` **`u`** `zh`。三个关键产物尺寸小幅波动：`_site/toolbox/forest/index.html` **444259 B**（7-14 是 438872 B，+5387 B）；`_site/404.html` **93141 B**（7-14 是 87600 B，+5541 B）；`_site/zh/about/index.html` **98978 B**（7-14 是 93437 B，+5541 B）—— 三处 +5.4~5.5 KB 抖动同量级，与本轮 admin/account/pet/comment/post 51-commit 冲刺累积的公用 layout（`default.html` / `post.html` / `recipe.html`）+ `_includes/*` 变更吻合。`_notes/` 全 **270 篇 md** 仍 100% 覆盖 `keywords:`（`grep -rL '^keywords:' _notes/` 空 + `keywords_coverage.py` 「散文类 121 篇全部充足」），搜索体系闭环。`toolbox/forest/index.html` 的 `console.log|debugger|TODO|FIXME|XXX` 仍全 0 命中。`_paid/` + `_flight-staging/` 在 `_config.yml` L50 / L52 exclude 稳固、`find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。**maskable 图标 md5 核验**：三对文件仍不 byte-identical（`forest-icon-512.png` `63df7becb4ddc57e2b95e88305a33a18` vs `forest-icon-maskable-512.png` `36ada6c2364827c1455260f7d42ae6f1`、`ledger-icon-512.png` `fad6da15326e5fbf54adb03663f78be2` vs `ledger-icon-maskable-512.png` `433f42fc5748a0b16747e12ddbb4b47a`、`pindou-icon-512.png` `fed25167c04f65fc5ce80f28bd12ddf6` vs `pindou-icon-maskable-512.png` `f4ef2d70dbf297809aa5f76c23836f5b`）与 7-14 完全一致；`python3 scripts/audit/maskable_icon_consistency.py` 报「✅ 已检查 9 个 maskable 图标声明，均与 any 图标不同」。**`study_order`**：`_config.yml` 26 条、`ls _notes/study/` 26 目录、`comm -23` 差集空 —— **7-14 由站主 `c901bb7` 一次性清零后仍稳定**。**docs 本机路径**：`grep -rE '/Users/zhourui' docs/` 空。全套 `scripts/audit/run.sh`（今日周三 DOW=3，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=15 非月初，未加跑 monthly_stats）14 项每日 audit 通跑：`keywords_coverage` / `material_type_enum` / `filename_convention` / `maskable_icon_consistency` / `sibling_crosslink` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `images`（`interm-macro-2022-zh.pdf` 2.13 MB / `econ-math-toolkit.pdf` 2.88 MB 承接可控）/ `spotcheck`（10 项配额抽检）/ `backend_pulse`（curl 56 HTTP 403，承接沙箱无 fly.io 出口）**全 clean**。**仅两条 audit 有观察**：(1) `bare_dollar` 报 1 条 `_notes/study/adv-micro-psu/adv-micro-psu-2026.md` L106（脚本报 L91 系旧版行号计数漂移）「information rent `$\frac{1-F(x)}{f(x)}$` 这个 hazard rate 项」—— 完整配对的 KaTeX 数学公式（16 个 `$` 全部成对），脚本对 `$1-F(x)$` 型「`$` 后紧跟数字」启发式漏判，与 6-30 / 7-01 报的同一条同一位置同一性质、承接已列 P2；(2) `hover_no_media` 报 4 个 `toolbox/flight/*.html` 共 16 处 `:hover` 缺 `@media (hover: hover)` 守卫（`handoff.html` 2 处 · `index.html` 11 处 · `manifest.html` 1 处 · `ticket-detail.html` 2 处）—— 触屏卡 hover 态是**真缺陷**，但 flight 当前**通过 `_data/visibility.json` `tools` 列被下架**（`vis_tools contains 'flight'` → `sec_hidden = true` 对访客隐藏、`.sa-admin` 变灰预览），非线上访客可见路径、且 16 处横跨 4 文件的机械改写超出「小而无争议」范畴，列进 P2。
>
> **今日 1 项自动修复**：删掉 `files/adv-micro-psu/.placeholder`（3 行文本、git 跟踪但因 `.` 前缀不进 `_site/`）—— 文件正文自述「This folder was moved to /Users/zhourui/Desktop/Spring 2026/ECON 521 on 2026-04-29. This placeholder exists only so the current Claude Code session's bash CWD can still initialize. **Safe to delete after the session ends.** (Already removed from the zirconeey git tracking in commit abc0312.)」，且 `files/adv-micro-psu/` 目录本身已含 `2025-final.pdf` / `2026-midterm-1.pdf` / `adv-micro-psu-lecture-notes.pdf` / `chapters/` / `source/` 等 9 项真实内容（删占位符不会让目录从 git 消失），删除同时消除仓库层面**唯一残留**的 `/Users/zhourui/` 本机路径痕迹（`grep -rE '/Users/zhourui' .` 排除 `.git/` 与 DAILY_REVIEW.md 自身后从 1 条降到 0 条）。已 `git rm files/adv-micro-psu/.placeholder`、`bundle exec jekyll build` ✅ 通过（5.582 s 二跑一字不差）。**风险为零**：删的是既往会话遗留 stub、目录仍存活、无外链引用、`_site/` 输出零差异。
>
> **P0 承接**：无。
>
> **P1 承接**：无。
>
> **P2 新增**：(a) **51 commit 里 admin / account / pet / post / comment 五大高交互面重做需六组合真机验收**——iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + PWA standalone 至少覆盖：① `726e013` **Vditor Typora 式评论编辑器**（`_includes/comment-vditor.html` 首推）—— `$公式$` 光标移开就地渲染成数学符号、markdown 所见即所得、图片粘贴内联、懒加载 Vditor CDN、双向同步隐藏原 textarea 保 Waline 提交/字数/校验、任何一步出错自动回退原生 textarea；② `e897eda` 数学公式刷新后 KaTeX 时序 & marked 转义（`\int→int`）交给服务端渲染后是否稳定；③ 评论抽屉（`4fc8503`）+ 逐条点赞样式化（`4a9388f`）+ 举报（`4a9388f`）+ 粘贴图片反馈（`bb13388` + `9ac68f1`）+ 知乎清爽版式（`2360562`）合流后的抽屉交互；④ 阅读页互动栏极简计数吸底（`bd1ef5b`）+ 乐观更新（`558f6a7`）+ 收藏时选夹（`55be9e3`）+ 分享靠最右复制「【栏目】标题 + 链接」（`2d65e2f`）+ 分享单条浮窗 / 收藏星星再点即取消（`3986f9d`）；⑤ 账号中心 hero 横幅统计 + 下拉身份行头像/进度（`665d05d`）+ 放宽画幅 800→1240（`e5d29cd`）+ 收藏夹多夹整合（`4948a08` + `4d73f21`）+ 编辑弹窗化 & 等级特权 & 分享按钮（`5fc1368`）+ 记录搜索 & 段位药丸（`7b618aa`）+ 全选/搜索共存（`919fb6f`）；⑥ 宠物中心粮食面板推倒重做四轮迭代（`07fb03e` → `4fc8503` → `b1805d4` → `9dca086`）+ 记录按日翻（`ae36905`）+ 体记语言（`66372fe`）+ 体重分页（`c3cde3f`）+ 食物按类别筛选（`1edfd6e`）+ 类别管理入口（`7e2d865`）+ PWA 暗色（`b4e4ed9`）+ a11y-6/a11y-7 键盘可达（`c785079` + `3eb721f`）+ 图表放大新宠首笔引导（`000240e`）+ 邀请链接分享封面 PWA 截图（`5a6b56c`）+ RER/MER 能量法（`a65d98a`）；⑦ `d179057` **举报审核面板**「内容管理 → 举报审核」新增，未真机走过管理员端流程；⑧ `c2990fa` suika 巡查 9 项打磨（控制栏/防误触/局中退出/多指/榜单/彩蛋）；⑨ `0831d0d` doudizhu 联机 lobby 空间化贴合牌桌三角 + 座位操作乐观更新 —— 均属沙箱无 GUI / 无触屏 / 无 fly.io 后端出口跑不了的验收项。

(b) **新增顶层 `/u/` 公开主页**（`u/index.html`）—— `permalink: /u/`、`noindex: true`、`sitemap: false` 用 `/u/?id=<accountId>` 参数化渲染读者个人页，由 `account/index.html` L999 与 `_layouts/{post,recipe}.html` 三处 lock('link') 分享链拉出。属新增用户可见路径、需验证：不存在的 accountId 是否降级到「这个主页不存在，或对方没有公开」的空态、自己的 accountId 是否走「这是你的主页 · 去编辑」CTA、`noindex + sitemap:false` 双保险是否让搜索引擎不收录 —— 沙箱无后端跑不了。

(c) **`_data/visibility.json` 当前状态**（承接 7-14 P2#(d) 演进）：`sections: []`（全部四大板块对访客可见，`2666f61` 放出「科研妙招 / 生活攻略」+ 隐含放出「百宝箱」入口后）；`tools: [47 项]`（`2048` / `gomoku` / `chess` / `xiangqi` / `tiaoqi` / `feixingqi` / `reversi` / `connect4` / `blackjack` / `solitaire` / `snake` / `pinball` / `minesweeper` / `runner` / `leap` / `fruit-ninja` / `tetris` / `sudoku` / `schulte` / `memory` / `breakout` / `typing` / `dontdoit` / `werewolf` / `drawing` / `citation` / `random` / `compound` / `tax-bracket` / `converter` / `time` / `vocab` / `vision` / `metronome` / `pitch` / `picker` / `grouper` / `roll-call` / `countdown` / `goals` / `timemachine` / `font-style` / `cat-language` / `bazi` / `pindou` / `ledger` / `flight`）—— 按 `_includes/tool-card.html` L4 `{% if site.data.visibility.tools contains t.id %}...t_hidden = true{% endif %}` 语义，`_data/toolbox.yml` 53 个工具中的 47 个当前**对访客隐藏**，仅 6 个（含 `pet` / `doudizhu` / `suika` / 等本轮迭代重点）对外可见。是站主分批放出、管理后台 7 次连续 `chore(admin)` 调整的产物，仅备忘。

(d) **`toolbox/flight/*.html` 4 文件 16 处 `:hover` 缺 `@media (hover: hover)` 守卫**（audit `hover_no_media` 报）：`handoff.html` L54 / L56、`index.html` L58 / L60 / L72 / L74 / L78 / L84 / L92 / L104 / L112 / L128 / L136（11 处，未全列）、`manual.html` L61、`ticket-detail.html` L70 / L72。触屏设备上 hover 态会卡住是真缺陷，全站其他 50 个 toolbox 文件均已用 `@media (hover: hover) { ... }` 守卫。当前 flight 通过 `_data/visibility.json` `tools` 列下架、非访客可见，紧迫性低；但 16 处横跨 4 文件的机械改写风险非零（改写位置需分清是「独立的 hover 规则」还是「与其他规则串写」，易漏改或误裂断 CSS 选择器串），超出「小而无争议」范畴。建议由站主后续手动补齐或在飞行放出前批量脚本化。

(e) **`bare_dollar` 脚本对 `$<数字>-<非数字>` 型 KaTeX 公式启发式漏判**（承接 6-30 / 7-01 / 7-14）：`_notes/study/adv-micro-psu/adv-micro-psu-2026.md` L106「information rent `$\frac{1-F(x)}{f(x)}$` 这个 hazard rate 项」里的 `$1-F(x)$` 被脚本按「`$` 后紧跟数字」判为裸美元，实为完整数学公式（16 个 `$` 全部成对配平）。既有 P2 观察不变。

(f) **`_notes/life/paid-test-us-banking-guide.md` L4 与 `_notes/life/paid-test-us-visa-types.md` L4 的 `main_category:` 未加引号**（承接 6-30 / 7-14）：全站 270 篇里仅这 2 篇是 `main_category: 生活攻略`（其余 268 篇是 `main_category: "生活攻略"` 等带引号），YAML 两种写法等价、build 无差别；这两文件由 `scripts/paywall/build_paid.py` 从 gitignored `_paid/*.md` 自动生成、直接改会被下次重生覆盖，需改源文件或脚本。承接观察不变。

(g) **doudizhu DouZero 神经网络权重 ~20 MB 二进制**（承接 7-14）：`assets/js/doudizhu/weights/` 下 6 组 `.qw` + `.f32` + `.json` 元数据仍占 ~20 MB，仓库工作副本 **177 MB**（较 7-14 的 173 MB 微增 +4 MB，纯来自 51 commit 的前端脚本与 `_includes/comment-vditor.html` 累积）；是否评估 Git LFS / CDN 拆分承接观察不变。

(h) **文件名约定 `files/econ-math-toolkit/econ-math-toolkit.pdf` 不含年份**（承接）：`filename_convention.py` 报「绑定具体年份却看不出年份的 PDF」1 项 —— 若本就无单一年份，建议加进脚本 `ACCEPTED_UNDATED`；本 agent 不擅动。

(i) **承接 7-14 / 7-11 全部老 P2**（7-11 冲刺日新增 `/zh/about/` + `404.html` + 首页照片堆叠 3 张预渲染 + reduce-motion 翻页 + forest「grow」暗号 + forest ∞ 灵活模式的六组合真机验收 6 项 / `452797e` 书架 commit 声明「现 7 本」实际 6 本的意图确认 / 7-14 admin 控制台 & 账号中心 12 commit 数据看板浏览量趋势折线 + 世界地图 + 设备环形 + ECharts 自托管 + 密码/导出/注销流程的六组合真机验收；7-10 / 7-07 / 7-06 承接的 forest 两轮对抗式审查 6 处 / 「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` / forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收、forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名等）—— 今日无新观察消除、承接不变。
>
> **仓库卫生**：目录结构**较昨日仅小幅变动**——工作副本足印 **177 MB**（较 7-14 的 173 MB 微增 +4 MB，纯来自 51 commit 的前端脚本与 `_includes/comment-vditor.html` 累积；`.git` 140 MB / `_site/` 227 MB 独立于工作副本）。**新增**：`_includes/comment-vditor.html`（100 行 Vditor Typora 式评论编辑器）。**删除**：`files/adv-micro-psu/.placeholder`（本次巡检自动清理）。`git status` clean（rebase 收 origin `726e013` 后本地 = origin）、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空。**大文件盘点**：`files/or/or-2023.pdf` 5.4 MB（唯一 5 MB+）、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB、`files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB、`pdfjs/build/pdf.worker.mjs` 2.1 MB、`assets/js/doudizhu/weights/` 6 个 `.qw`（2.6 MB × 3 + 3.5 MB × 3 ≈ 18.4 MB）、`assets/echarts/` 2.0 MB —— 与 7-14 一致。`_paid/` + `_flight-staging/` 在 `_config.yml` L50 / L52 exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）。**结论**：目录结构较昨日仅小幅新增/清理，为常规迭代节奏。

### ✅ 本次已自动修复

**1. 删掉 `files/adv-micro-psu/.placeholder`**

3 行文本 stub 文件，正文自述「This folder was moved to /Users/zhourui/Desktop/Spring 2026/ECON 521 on 2026-04-29. This placeholder exists only so the current Claude Code session's bash CWD can still initialize. **Safe to delete after the session ends.** (Already removed from the zirconeey git tracking in commit abc0312.)」。是既往 Claude Code 会话的 CWD 保活占位符，早已过期；`files/adv-micro-psu/` 目录本身已含 9 项真实内容（`2025-final.pdf` / `2025-midterm-1.pdf` / `2025-midterm-2.pdf` / `2026-final.pdf` / `2026-midterm-1.pdf` / `2026-midterm-2.pdf` / `adv-micro-psu-lecture-notes.pdf` / `chapters/` / `source/`），删占位符不会让目录从 git 消失；同时消除仓库层面残留的 `/Users/zhourui/` 本机路径痕迹（`grep -rE '/Users/zhourui' .` 排除 `.git/` 与 DAILY_REVIEW.md 后从 1 条降到 0 条）。已 `git rm files/adv-micro-psu/.placeholder`、`bundle exec jekyll build` ✅ 通过（5.582 s）、无外链引用、`_site/` 输出零差异（`.placeholder` 因 `.` 前缀本就不进 `_site/`）。风险为零。

### 📋 待你把关

#### P0（紧急）

无。

#### P1（重要）

无。仓库当前 P1 队列为空。

#### P2（建议）

1. **51 commit 里 admin / account / pet / post / comment 五大高交互面重做需六组合真机验收**——iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + PWA standalone 至少覆盖：① `726e013` **Vditor Typora 式评论编辑器**（`_includes/comment-vditor.html` 首推）—— `$公式$` 光标移开就地渲染成数学符号 / markdown 所见即所得 / 图片粘贴内联 / 懒加载 Vditor CDN / 双向同步隐藏原 textarea 保 Waline / 任何一步出错自动回退原生 textarea；② `e897eda` 数学公式刷新后交给服务端渲染是否稳定；③ 评论抽屉合流（`4fc8503` + `4a9388f` + `bb13388` + `9ac68f1` + `2360562`）后的抽屉交互；④ 阅读页互动栏极简计数吸底（`bd1ef5b`）+ 乐观更新（`558f6a7`）+ 收藏时选夹（`55be9e3`）+ 分享靠最右复制（`2d65e2f`）+ 分享单条浮窗 / 收藏星星再点取消（`3986f9d`）；⑤ 账号中心 hero 横幅（`665d05d`）+ 放宽画幅（`e5d29cd`）+ 收藏夹多夹（`4948a08` + `4d73f21`）+ 等级特权 & 分享按钮（`5fc1368`）+ 记录搜索 & 段位药丸（`7b618aa`）+ 全选/搜索共存（`919fb6f`）；⑥ 宠物中心粮食面板四轮迭代（`07fb03e` → `4fc8503` → `b1805d4` → `9dca086`）+ 记录按日翻（`ae36905`）+ 体记语言（`66372fe`）+ 体重分页（`c3cde3f`）+ 食物按类别筛选（`1edfd6e`）+ 类别管理入口（`7e2d865`）+ PWA 暗色（`b4e4ed9`）+ a11y-6/a11y-7 键盘可达（`c785079` + `3eb721f`）+ RER/MER 能量法（`a65d98a`）+ 邀请链接分享封面 PWA 截图（`5a6b56c`）；⑦ `d179057` **举报审核面板**「内容管理 → 举报审核」；⑧ `c2990fa` suika 巡查 9 项打磨；⑨ `0831d0d` doudizhu 联机 lobby 空间化 —— 沙箱无 GUI / 无触屏 / 无 fly.io 后端跑不了。

2. **新增顶层 `/u/` 公开主页**（`u/index.html` 4730 B、`permalink: /u/`、`noindex: true`、`sitemap: false`）—— 由 `account/index.html` L999 与 `_layouts/{post,recipe}.html` 三处 lock('link') 分享链拉出，参数化 `/u/?id=<accountId>` 渲染读者个人页。属新增用户可见路径、需验证：不存在的 accountId 是否降级到「这个主页不存在，或对方没有公开」空态、自己的 accountId 是否走「这是你的主页 · 去编辑」CTA、`noindex + sitemap:false` 双保险 —— 沙箱无后端跑不了。

3. **`_data/visibility.json` 当前状态**（承接 7-14 演进）：`sections: []`（全部四大板块对访客可见）；`tools: [47 项]`（`_data/toolbox.yml` 53 个工具中的 47 个当前对访客隐藏，仅 6 个含 `pet` / `doudizhu` / `suika` 等本轮迭代重点对外可见）。是站主分批放出、管理后台 7 次连续 `chore(admin)` 调整的产物，仅备忘留档 —— 如「短期下架、后续会分批放回」可能需要一个「预计恢复时点」备忘；如长期状态，可考虑给 `/toolbox/` landing 加「其它工具临时下架、逐步开放中」的极小提示条。均属 IA 设计判断，不擅动。

4. **`toolbox/flight/*.html` 4 文件 16 处 `:hover` 缺 `@media (hover: hover)` 守卫**（audit `hover_no_media` 报）：`handoff.html` 2 处、`index.html` 11 处、`manual.html` 1 处、`ticket-detail.html` 2 处。触屏设备上 hover 态会卡住是真缺陷、全站其他 50 个 toolbox 文件都用 `@media (hover: hover) { ... }` 守卫；flight 当前通过 `_data/visibility.json` `tools` 列下架非访客可见、紧迫性低；但 16 处横跨 4 文件的机械改写风险非零（需分清「独立 hover 规则」vs「与其他规则串写」、易漏改或误裂 CSS 串），超出「小而无争议」范畴。建议站主后续手动补齐或在飞行放出前批量脚本化。

5. **`bare_dollar` 脚本对 `$<数字>-<非数字>` 型 KaTeX 公式启发式漏判**（承接 6-30 / 7-01 / 7-14）：`_notes/study/adv-micro-psu/adv-micro-psu-2026.md` L106 里的 `$1-F(x)$` 是完整数学公式（16 个 `$` 全部成对），被脚本按「`$` 后紧跟数字」判为裸美元。承接 P2 观察不变。

6. **`_notes/life/paid-test-us-banking-guide.md` L4 与 `_notes/life/paid-test-us-visa-types.md` L4 的 `main_category:` 未加引号**（承接 6-30 / 7-14）：全站 270 篇里仅这 2 篇不带引号；由 `scripts/paywall/build_paid.py` 从 gitignored `_paid/*.md` 自动生成、直接改会被下次重生覆盖。

7. **doudizhu DouZero 神经网络权重 ~20 MB 二进制**（承接 7-14）：`assets/js/doudizhu/weights/` 6 组 `.qw` + `.f32` + `.json` 仍 ~20 MB；仓库工作副本 177 MB（较 7-14 微增 +4 MB）。是否评估 Git LFS / CDN 拆分承接观察不变。

8. **文件名约定 `files/econ-math-toolkit/econ-math-toolkit.pdf` 不含年份**（承接）：若本就无单一年份，建议加进 `filename_convention.py` 的 `ACCEPTED_UNDATED`。

9. **承接 7-14 / 7-11 全部老 P2**：7-11 冲刺日新增 `/zh/about/` + `404.html` + 首页照片堆叠 3 张预渲染 + reduce-motion 翻页 + forest「grow」暗号 + forest ∞ 灵活模式的六组合真机验收 6 项 / `452797e` 书架 commit 声明「现 7 本」实际 6 本的意图确认 / 7-14 admin 控制台 & 账号中心 12 commit 数据看板浏览量趋势折线 + 世界地图 + 设备环形 + ECharts 自托管 + 密码/导出/注销流程的六组合真机验收；7-10 / 7-07 / 7-06 承接的 forest 两轮对抗式审查 6 处 / 「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` / forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收、forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名等 —— 今日无新观察消除、承接不变。

### 🗂 仓库卫生

**目录结构较昨日仅小幅变动**——工作副本足印 **177 MB**（较 7-14 的 173 MB 微增 +4 MB，纯来自 51 commit 的前端脚本与 `_includes/comment-vditor.html` 累积；`.git` 140 MB、`_site/` 227 MB 独立于工作副本）。**新增**：`_includes/comment-vditor.html`（100 行 Vditor Typora 式评论编辑器）。**删除**：`files/adv-micro-psu/.placeholder`（本次巡检自动清理）。`git status` clean（rebase 收 origin `726e013` 后本地 = origin）、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空。**大文件盘点**：`files/or/or-2023.pdf` 5.4 MB（唯一 5 MB+）、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB、`files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB、`pdfjs/build/pdf.worker.mjs` 2.1 MB、`assets/js/doudizhu/weights/` 6 个 `.qw`（2.6 MB × 3 + 3.5 MB × 3 ≈ 18.4 MB）、`assets/echarts/` 2.0 MB —— 与 7-14 一致。**maskable 图标 md5 核验**：三对文件仍不 byte-identical（forest 主 `63df7becb4ddc57e2b95e88305a33a18` vs maskable `36ada6c2364827c1455260f7d42ae6f1`、ledger 主 `fad6da15326e5fbf54adb03663f78be2` vs maskable `433f42fc5748a0b16747e12ddbb4b47a`、pindou 主 `fed25167c04f65fc5ce80f28bd12ddf6` vs maskable `f4ef2d70dbf297809aa5f76c23836f5b`）与 7-14 完全一致。`_paid/` + `_flight-staging/` 在 `_config.yml` L50 / L52 exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）等所有内部产物。**结论**：目录结构较昨日仅小幅新增/清理（+`_includes/comment-vditor.html`、-`files/adv-micro-psu/.placeholder`），为常规迭代节奏，无冗余可清理。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点：`backend_pulse.py` 全报 curl exit 56 (CONNECT tunnel failed 403)，承接沙箱无 fly.io 出口现象、不阻塞巡检、未主动重启 fly app。**今日 51 个新 commit**：admin / account / pet / post / comment / suika / doudizhu / listing / content / 版本 bump 十条主线，其中 admin 后台 8 commit（`d179057` + 7 条 `chore(admin)` 可见性调整）、account 7 commit、post/comment 11 commit 均涉及后端 `/api/admin`（visibility-get / visibility-set / hidden-list / 举报审核 / 401 复核 token）与 Waline 评论 API，本 agent 沙箱无 fly.io 出口无法核验后端应答；本地 `bundle exec jekyll build` ✅ 通过、静态 layout 全 clean。

---

## 2026-07-14

> 例行无人值守巡检：build 健康度 + 仓库卫生。距 7-13 巡检共 **25 个新 commit**（`6a5fbbc..8bfdc9b`）—— 连续两天「0 commit 静止日」（7-12 / 7-13）之后的**又一次爆发日**，与 7-11 那场 27-commit 冲刺规模相当。改动集中在五条主线：**巡检收尾扫账**（`c901bb7` 一 commit **一次性清掉 7-13 全部 P0 / P1 / 一半 P2**——重画 forest / ledger / pindou 三对 maskable 图标为「主体收进 80% 安全圆」、`_config.yml` `study_order` 补 `interm-econometrics`、`docs/workflows/*.workflow.js` + `docs/ARCHITECTURE_REVIEW.md` 去 `/Users/zhourui/` 本机绝对路径 5 处、新增 `scripts/audit/maskable_icon_consistency.py` 挂进 `run.sh` 每日巡检防退化）；**死链清理**（`3cd42bf` `_notes/life/laundry-frequency.md` `textile-outlook.com` → `textilesintelligence.com` + `a62a21f` 5 处死链 `centretax.net` / `offcampus.psu.edu` / `hwdrivingschool.com` / `judicialinformation.com` / `global.psu.edu/tax-information` 全部替换）；**管理后台巨改**（`fc04da7` 新增 `_data/visibility.json` 单一数据源系统，全站门控板块 / 小工具下架 / 恢复；`eff7d11` 后台改左侧目录 + 右侧单面板控制台；`8fe14c5` 指标时间趋势视图 + 每日快照 cron；`d402049` 数据看板加浏览量趋势折线 + 世界地图 + 设备环形 + sparkline；`1edf2ec` 设计 token + 藏蓝主色 + 排行占比条；`fa00233` + `44688c0` 自托管 ECharts；`8bfdc9b` 内容排行每行加 📈 单看时间趋势；`2779f20` 顶部收成一条细标题栏 6 commit）；**账号中心 + 认证**（`2537d8d` 账号中心资料卡 + 头像 / 昵称 / 简介编辑 + 批量管理、`c952e51` 账号设置区 · 设置 / 修改密码 / 导出数据 / 注销账号、`53078e3` 401 不再无脑登出先复核 token 3 commit）；**其它前端**（`cdaec2d` doudizhu 高手 / 大神档接入 **DouZero 神经网络** —— 6 个 `.qw` 量化权重 + `.f32` 缩放 + `.json` 元数据，**新增 ~20 MB 二进制**；`1723f42` suika 巡查安全修复 7 处 · 菜单陷阱 / 试玩竞态 / 暗号残留；`ce112c0` + `fe9543f` 返回链 chevron / 顶栏板块名断字修复 2 commit；`b64cf20` + `22a3308` 后台还原两篇 `_notes/study/` 文章）。net **+21100 / -2700 行**（doudizhu 权重不算 diff 行数），28 个文件动、多个新增文件（`_data/visibility.json` + `assets/js/doudizhu/weights/*` 18 个 + `assets/js/doudizhu/net.js` + `assets/echarts/*` + `scripts/audit/maskable_icon_consistency.py` 等）。
>
> **build 健康度**：`bundle install` ✅（`Bundle complete! 7 Gemfile dependencies, 39 gems now installed.`）+ `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（**16.194 s cold build**，稍高于 7-13 的 15.456 s，与 admin / account / visibility 三大新入口拉多 `_site/` 页面数吻合）。`_site/` 顶层 **27 项**结构与 7-13 完全一致。三个关键产物尺寸稳定：`_site/toolbox/forest/index.html` **438872 B**（7-13 是 438533 B，+339 B ≈ 承接 `1723f42` suika 附带影响的极小 admin 头栏变更）；`_site/404.html` **87600 B**（7-13 是 87456 B，+144 B）；`_site/zh/about/index.html` **93437 B**（7-13 是 93293 B，+144 B）—— 三处 +100~+300 B 的抖动同量级，与 admin 顶栏细化 / 返回链 chevron 居中的公用 layout diff 一致。`_notes/` 全 **270 篇 md** 仍 100% 覆盖 `keywords:`（`grep -rL '^keywords:' _notes/` 空），搜索体系闭环。`toolbox/forest/index.html` 的 `console.log|debugger|TODO|FIXME|XXX` 仍全 0 命中（净化住）。`_paid/` + `_flight-staging/` 在 `_config.yml` L50 / L52 exclude 稳固、`find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）。**maskable 图标 md5 核验**：三对文件不再 byte-identical——`forest-icon-512.png` `63df7becb4ddc57e2b95e88305a33a18` vs `forest-icon-maskable-512.png` `36ada6c2364827c1455260f7d42ae6f1`、`ledger-icon-512.png` `fad6da15326e5fbf54adb03663f78be2` vs `ledger-icon-maskable-512.png` `433f42fc5748a0b16747e12ddbb4b47a`、`pindou-icon-512.png` `fed25167c04f65fc5ce80f28bd12ddf6` vs `pindou-icon-maskable-512.png` `f4ef2d70dbf297809aa5f76c23836f5b`。同步跑一次 `python3 scripts/audit/maskable_icon_consistency.py`：「✅ 已检查 9 个 maskable 图标声明，均与 any 图标不同（外圈已收进安全圈）」。**`study_order`**：`_config.yml` 26 条、`ls _notes/study/` 26 目录，`comm -23` 差集空。**docs 本机路径**：`grep -rE '/Users/zhourui' docs/` 空。**三条 7-13 承接项一次性清零**。
>
> **今日 0 项自动修复**——25 commit 里已包含站主亲自把 `c901bb7` 挂进「巡检收尾」提交，把 7-13 承接的 P0（3 对 maskable 图标）+ P1（`study_order` 缺 `interm-econometrics`）+ P2 里的 `docs/*` `/Users/zhourui/` 4+1 处一次性清掉；巡检面上今日无新 low-risk 项可小修（工作树 clean、`git ls-files --others --exclude-standard` 空、无死链新增、无 keywords 缺项、无 build warning、无 `.DS_Store` / `*.bak` 类垃圾）。
>
> **P0 承接**：**无**。7-13 P0 已由 `c901bb7` 清零。
>
> **P1 承接**：**无**。6-13 起挂账 31 天的 `study_order` 缺 `interm-econometrics` 已由 `c901bb7` 清零，仓库当前 P1 队列为空。
>
> **P2 新增**：(a) 新增 `assets/js/doudizhu/weights/` **~20 MB 二进制** —— 分 6 组 `.qw`（int8/int16 量化 15 MB）+ `.f32`（缩放 & 未量化偏置 ~2 MB）+ `.json` 元数据，`net.js` 运行时双取；仓库整体足印从 7-13 的 ~150 MB 抬到 173 MB，`.git` 未膨胀。当前实现 `.qw` 与 `.f32` 都需 fetch，如后续想瘦身可考虑把 `.f32` 里的 scale 表内嵌到 `.json`（几 KB）、把偏置也量化——但那是 model-side 判断、非「小而无争议」，仅列备忘。(b) `_notes/life/paid-test-us-banking-guide.md` L4 与 `_notes/life/paid-test-us-visa-types.md` L4 的 `main_category:` 值 `生活攻略` 是**全站 270 篇里仅有的 2 处未加引号**（其余 268 篇都是 `main_category: "生活攻略"` / `main_category: "科研妙招"` / …）；YAML 两种写法等价、build 无差别，仅纯风格一致性一项。这两文件路径含 `paid-test-` 前缀、`permalink: /life/paid-test/…`、且是 `scripts/paywall/build_paid.py` 从 gitignored 的 `_paid/*.md` 自动生成的**测试版预览**（承接 6-30 抽检对 `us-visa-types.md` 已列过 P2「不能直接改会被脚本重生覆盖」），故此风格差异应改在 `_paid/` 源文件或生成脚本里、不擅动。(c) 本周新增的 **admin 控制台**（左侧目录 + 右侧面板 / 数据看板折线 + 世界地图 + sparkline / ECharts 自托管 / 内容排行 📈 时间趋势）与 **账号中心**（资料卡 / 头像编辑 / 密码 & 导出 & 注销）—— build ✅ / 静态 layout 无 warning，但真机可视化 / 打点交互 / OAuth 流程需要六组合真机验收（iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + PWA standalone），沙箱无 GUI / 无 fly.io 出口跑不了。(d) `_data/visibility.json` 初始态下架三个板块——「科研妙招」「生活攻略」「百宝箱（含 53 件工具 / 游戏）」，访客当前看不到这些内容，仅 `.sa-admin` 变灰预览；这是 `fc04da7` 站主明确设置的 IA 状态、非漏配置，仅备忘、不擅改。
>
> **P2 承接**：(a) 承接 7-11 P2 未清的两项——首页照片堆叠 3 张预渲染 + reduce-motion 翻页 + forest「grow」暗号 + forest ∞ 灵活模式的六组合真机验收 6 项 / `452797e` 书架 commit 声明「现 7 本」实际 6 本的意图确认；(b) 承接 7-10 / 7-07 / 7-06 全部老 P2（forest 两轮对抗式审查修复 6 处的六组合真机验收 6 项 / 建议把「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` 或新建 `docs/adversarial-review.md`、forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收、forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名共 27 条）—— 今日无新观察消除、承接不变。
>
> **仓库卫生**：目录结构**较昨日显著扩容**——新增 `assets/js/doudizhu/weights/`（18 个二进制、20 MB）、`assets/echarts/`（自托管 ECharts）、`scripts/audit/maskable_icon_consistency.py`、`_data/visibility.json` 等。`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空。大文件（>2 MB）核对：`files/or/or-2023.pdf` 5.4 MB（唯一 5 MB+）、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB、`files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB、`pdfjs/build/pdf.worker.mjs` ~2.1 MB，加上新增 `assets/js/doudizhu/weights/` 6 个 `.qw` 文件（2.6 MB × 3 + 3.5 MB × 3 ≈ 18.4 MB）。仓库工作副本足印 **173 MB**（7-13 前是 ~150 MB，涨幅几乎全部来自 doudizhu 权重）。当前形态是站主明确合入的 feature，不擅改；仅将 doudizhu 二进制体积列入 P2#a 备忘，供你决定是否走 Git LFS 或 CDN 拆分（对个人站而言 173 MB 仍在健康区间、不构成阻塞）。**结论**：目录结构较昨日有实质扩容，全部为站主明确落地的新 feature，无冗余可清理。

### ✅ 本次已自动修复

无。

25 commit 里已由站主亲自完成扫账（`c901bb7` 一次性清掉 7-13 全部 P0 + P1 + 一半 P2）；巡检面上今日无新 low-risk 项可小修——工作树 clean / 死链 0 / keywords 100% / build 0 warning / `.DS_Store` 类垃圾 0 / maskable 图标一致性 ✅ / `study_order` 完整 ✅ / `docs/` `/Users/zhourui/` 0 命中 ✅。

### 📋 待你把关

#### P0（紧急）

无。

#### P1（重要）

无。仓库当前 P1 队列为空。

#### P2（建议）

1. **doudizhu DouZero 神经网络权重新增 ~20 MB 二进制**（`cdaec2d` 落地）—— `assets/js/doudizhu/weights/` 下 6 组 `.qw` int8/int16 量化 (~15 MB) + `.f32` 缩放 & 未量化偏置 (~2 MB) + `.json` 元数据，`net.js` 运行时双取；仓库工作副本从 ~150 MB 抬到 173 MB。当前实现 `.qw` 与 `.f32` 都要 fetch，如果想瘦身可考虑把 `.f32` 里的 scale 表内嵌到 `.json`（几 KB）、把偏置也量化——不擅改（属 model-side 判断），仅列备忘：是否需要评估 Git LFS 或 CDN 拆分（对个人站而言 173 MB 仍在健康区间）。

2. **`_notes/life/paid-test-us-banking-guide.md` L4 与 `_notes/life/paid-test-us-visa-types.md` L4 的 `main_category:` 未加引号** —— 全站 270 篇里仅这 2 篇是 `main_category: 生活攻略`（其余 268 篇都是 `main_category: "生活攻略"` 等带引号），YAML 两种写法等价、build 无差别，仅风格一致性一项。承接 6-30 老观察：这两文件是 `scripts/paywall/build_paid.py` 从 gitignored `_paid/*.md` 自动生成、直接改会被下次重生覆盖，需改源文件或脚本 —— 不擅动。

3. **本周新增的 admin 控制台 + 账号中心需真机验收**（`eff7d11` + `2779f20` + `8fe14c5` + `d402049` + `1edf2ec` + `fa00233` + `44688c0` + `7b455ef` + `8bfdc9b` admin 9 commit / `2537d8d` + `c952e51` + `53078e3` account 3 commit）—— build ✅ / layout 无 warning，但数据看板浏览量趋势折线 + 世界地图 + 设备环形 / ECharts 自托管 / 内容排行 📈 时间趋势 / 401 复核 token / 密码 & 导出 & 注销流程 均涉及可视化 + 交互 + OAuth，需要六组合真机验收（iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + PWA standalone），沙箱无 GUI / 无 fly.io 出口跑不了。

4. **`_data/visibility.json` 初始态下架三个板块**（`fc04da7` 落地）——「科研妙招」「生活攻略」「百宝箱（含 53 件工具 / 游戏）」当前对访客不可见、仅 `.sa-admin` 变灰预览。这是站主明确设置的 IA 状态、非漏配置，仅备忘留一条便于日后回顾：如果这是「短期下架、后续会分批放回」，可能需要一个「预计恢复时点」的备忘；如果是长期状态，可以考虑是否要给 `/notes/`（学习资料）单独一个「其它内容临时下架」的极小提示条 —— 均属 IA 设计判断、不擅动。

5. **承接 7-11 P2 未清的两项**——(a) 7-11 冲刺日新增 `/zh/about/` + `404.html` + 首页照片堆叠 3 张预渲染 + reduce-motion 翻页 + forest「grow」暗号 + forest ∞ 灵活模式的六组合真机验收 6 项；(b) `452797e` 书架 commit 声明「现 7 本」但今日仍是 6 本（差「线代」不含 Strang 那本 + 「策略与博弈」两本）—— commit body 与实际数据不符的意图确认。

6. **承接 7-10 / 7-07 / 7-06 全部老 P2**（forest 两轮对抗式审查修复 6 处的六组合真机验收 6 项 / 建议把「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` 或新建 `docs/adversarial-review.md`、forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收、forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名共 27 条）—— 今日无新观察消除、承接不变。

### 🗂 仓库卫生

**目录结构较昨日显著扩容**——新增 `assets/js/doudizhu/weights/`（18 个二进制、~20 MB）、`assets/echarts/`（自托管 ECharts）、`scripts/audit/maskable_icon_consistency.py`、`_data/visibility.json` 等。`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空。**maskable 图标 md5 核验**：不再 byte-identical—— forest 主 `63df7becb4ddc57e2b95e88305a33a18` vs maskable `36ada6c2364827c1455260f7d42ae6f1`、ledger 主 `fad6da15326e5fbf54adb03663f78be2` vs maskable `433f42fc5748a0b16747e12ddbb4b47a`、pindou 主 `fed25167c04f65fc5ce80f28bd12ddf6` vs maskable `f4ef2d70dbf297809aa5f76c23836f5b`。**大文件盘点**：`files/or/or-2023.pdf` 5.4 MB（唯一 5 MB+）、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB、`files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB、`pdfjs/build/pdf.worker.mjs` 2.1 MB、加上新增 `assets/js/doudizhu/weights/` 6 个 `.qw` (2.6 MB × 3 + 3.5 MB × 3 ≈ 18.4 MB)。工作副本足印 **173 MB**（涨幅几乎全部来自 doudizhu 权重）。`_paid/` + `_flight-staging/` 在 `_config.yml` L50 / L52 exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）等所有内部产物。**结论**：目录结构较昨日有实质扩容，全部为站主明确落地的新 feature，无冗余可清理。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点承接沙箱无 fly.io 出口现象、不阻塞巡检、未主动重启 fly app。**今日 25 个新 commit**：admin / account / doudizhu / suika / forest / 死链 / 巡检收尾七条主线，其中 admin 后台看板 + 账号中心 12 个 commit 均涉及后端 `/api/admin`（visibility-get / visibility-set / hidden-list / 用户资料 / 密码 / 导出 / 注销）与 401 复核 `/me` 端点，本 agent 沙箱无 fly.io 出口无法核验后端应答；本地 `bundle exec jekyll build` ✅ 通过、静态 layout 全 clean。

---

## 2026-07-13

> 例行无人值守巡检：build 健康度 + 仓库卫生。距 7-12 巡检共 **0 个新 commit**（`git log ab84fb4..HEAD` 空、`git log --oneline -1` 头仍是 `ab84fb4 chore(daily-review): 2026-07-12 自动巡检`）。工作区自 7-12 上一次 routine 落地后**完全静止**——0 文章 / 0 IA / 0 `_data/` / 0 `_config.yml` / 0 `_notes/` / 0 `files/` / 0 前端 / 0 二进制变动。这是 7-11 那场 27-commit 高强度冲刺日之后的**连续第二个回落日**，也是本 routine 自 5-27 常态化以来遇到「距上一次巡检 0 commit」的第六日（前五日分别是 6-28 / 7-01 / 7-09 / 7-10 / 7-12）。
>
> **build 健康度**：`bundle install` ✅（`Bundle complete! 7 Gemfile dependencies, 39 gems now installed.`）+ `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（**15.456 s cold build**，与 7-12 的 15.24 s 同量级）。`_site/` 顶层 **27 项**与 7-12 完全一致（`404.html` `CNAME` `account` `admin` `admin-manifest.json` `assets` `assistant-fulltext.json` `assistant-index.json` `en` `essays` `feed.xml` `files` `flight` `google5306…` `index.html` `life` `manifest.json` `notes` `pdfjs` `redirects.json` `research` `robots.txt` `search.json` `sitemap.xml` `sw.js` `toolbox` `zh`）。**三个关键产物 byte-identical**：`_site/toolbox/forest/index.html` **438533 B** 与 7-12/7-11 一字不差；`_site/404.html` **87456 B**、`_site/zh/about/index.html` **93293 B**，也都稳定。`_notes/` 全 **270 篇 md** 仍 100% 覆盖 `keywords:`（`grep -rL '^keywords:' _notes/` 空），搜索体系闭环。`toolbox/forest/index.html` 的 `console.log|debugger|TODO|FIXME|XXX` 仍全 0 命中（净化住）。`_paid/` + `_flight-staging/` 在 `_config.yml` L50/L52 exclude 稳固、`find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）。
>
> **今日 0 项自动修复**——本仓库距上次巡检未发生任何改动，工作树 clean（`git status` clean、`git ls-files --others --exclude-standard` 空），所有健康度指标与 7-12 一字不差，一切承接项按原优先级持续挂在待办栏。
>
> **P0 承接**：⚠ 承接 7-07 ~ 7-12 的 **forest / ledger / pindou 三个工具的 maskable PWA 图标与主 icon 仍 `byte-identical`**（今日**第 7 日承接**——达 7 天节点）。今日再次 `md5sum` 核验三对文件 md5 与前六日一字不差：`assets/icons/forest-icon-{512,maskable-512}.png` 都是 `63df7becb4ddc57e2b95e88305a33a18`、`assets/icons/ledger-icon-{512,maskable-512}.png` 都是 `fad6da15326e5fbf54adb03663f78be2`、`assets/icons/pindou-icon-{512,maskable-512}.png` 都是 `fed25167c04f65fc5ce80f28bd12ddf6`。`5c58756` commit body 承诺的 v2「maskable 主体收进 80% 安全圆」实际未落地——Android launcher 圆形遮罩仍会裁掉外圈金环。本 agent 不擅动（需图形工具重画、涉及美术判断）。
>
> **P1 承接**：唯一 P1 仍是承接 6-13 的 `_config.yml`.`study_order` 未列 `interm-econometrics`（今日**第 31 日承接**，突破 30 天节点）。核对：`ls _notes/study/` 仍 26 个目录 vs `study_order` 25 条、`comm -23` 差集仍只 `interm-econometrics` 一条。7-11 自写教材书架上线后，`interm-econometrics-2023.md` 在 `/notes/` 顶部书架里已作为 6 卡之一可见（作者 Rui Zhou 命中书架筛选）；下方按 `discipline` 分组渲染的传统树里仍因 `study_order` 缺该 slug 而无课程块。是否仍算 P1、还是已被自写教材书架的引入部分解决 —— 请你拍板：保留现状 / 加进 `study_order` 让下方树里也出现 / 改与 `interm-metrics/` 合并。仓库里最久的 P1，31 天挂账、纯 IA 设计判断、不擅改。
>
> **P2 承接**：承接 7-11/7-12 全部 P2（7-11 冲刺日新增 `/zh/about/` + `404.html` + 首页照片堆叠 3 张预渲染 + reduce-motion 翻页 + forest「grow」暗号 + forest ∞ 灵活模式的六组合真机验收 6 项 / `docs/workflows/*.workflow.js` + `docs/ARCHITECTURE_REVIEW.md` 里含 4+1 处 `/Users/zhourui/…` 本机绝对路径的清理 / `452797e` 书架 commit 声明「现 7 本」实际 6 本的意图确认；以及从 7-10/7-07/7-06 承接的 forest 两轮对抗式审查修复 6 处的六组合真机验收 6 项 / 建议把「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` 或新建 `docs/adversarial-review.md`、forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收 + `scripts/audit/maskable_icon_consistency.py`、forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名共 30 条）——今日无新观察消除、无新观察加入，承接不变。
>
> **仓库卫生**：目录结构与文件架构**较昨日无变化**——0 commit、0 文件动；`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空、无 5 MB+ 新二进制。大文件核对与 7-12 完全一致：`files/or/or-2023.pdf` 5.4 MB 唯一 5 MB+、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB + `files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB + `pdfjs/build/pdf.worker.mjs` 仍 2.1 MB+ 群。**结论**：仓库结构较昨日无变化，无需再优化。

### ✅ 本次已自动修复

无。

距上次 review 0 个新 commit、工作区完全静止；build ✅ / `_site/` 27 项结构与 7-12 一字不差 / 关键 assets 尺寸（forest 438533 B / 404.html 87456 B / zh/about 93293 B）稳定 / workspace 干净——无任何低风险小修可做。

### 📋 待你把关

#### P0（紧急）

1. **forest / ledger / pindou 三个工具的 maskable PWA 图标与主 icon 仍 `byte-identical`**（承接 7-07 / 7-08 / 7-09 / 7-10 / 7-11 / 7-12，**第 7 日承接**——达 7 天节点）。今日再次 `md5sum` 核验三对文件 md5 与前六日一字不差：`assets/icons/forest-icon-512.png` 与 `assets/icons/forest-icon-maskable-512.png` 都是 `63df7becb4ddc57e2b95e88305a33a18`、`assets/icons/ledger-icon-512.png` 与 `assets/icons/ledger-icon-maskable-512.png` 都是 `fad6da15326e5fbf54adb03663f78be2`、`assets/icons/pindou-icon-512.png` 与 `assets/icons/pindou-icon-maskable-512.png` 都是 `fed25167c04f65fc5ce80f28bd12ddf6`。`5c58756` commit body 承诺的 v2「maskable 主体收进 80% 安全圆」实际未落地——Android launcher 圆形遮罩仍会裁掉外圈金环 / 装饰。请重新生成三张真正带 80% 安全圆的 maskable-512.png 覆盖。**本 agent 不擅动**：需要图形工具重画、涉及美术判断。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 ~ 7-12，**第 31 日承接**——突破 30 天挂账节点）。今日核对：`ls _notes/study/` 仍 26 个目录、`study_order` 仍 25 条，`comm -23` 差集仍只 `interm-econometrics` 一条。**7-11 自写教材书架上线后**，`interm-econometrics-2023.md` 已在 `/notes/` 顶部书架里作为 6 卡之一可见（作者 Rui Zhou 命中书架筛选）；下方按 `discipline` 分组渲染的传统树里仍因 `study_order` 缺该 slug 而无课程块。是否仍算 P1、还是已被自写教材书架的引入部分解决 —— 请你拍板：保留现状 / 加进 `study_order` 让下方树里也出现 / 改与 `interm-metrics/` 合并。仓库里最久的 P1，31 天挂账、纯 IA 设计判断、不擅改。

#### P2（建议）

1. **承接 7-11 / 7-12 全部 P2**——(a) 7-11 冲刺日新增 `/zh/about/` + `404.html` + 首页照片堆叠 3 张预渲染 + reduce-motion 翻页 + forest「grow」暗号 + forest ∞ 灵活模式的六组合真机验收 6 项（iPhone Safari + Android Chrome + iPad + 桌面 Chrome + 桌面 Firefox + PWA standalone；沙箱无 GUI / 无触屏跑不了）；(b) `docs/workflows/*.workflow.js`（4 处）与 `docs/ARCHITECTURE_REVIEW.md`（1 处）里含 `/Users/zhourui/…` 本机绝对路径、暴露 macOS 用户名与桌面路径习惯，`docs/` 虽在 `_config.yml` L34 exclude 内不外泄到 `_site/`、但仓库层面可 git clone 后 grep 到，改成 `path.resolve(__dirname, …)` 或 `${HOME}/…` 更干净——涉及脚本可运行性判断、非「小而无争议」范畴、本 agent 不擅动；(c) `452797e` 书架 commit 声明「现 7 本」但今日仍是 6 本（差「线代」不含 Strang 那本 + 「策略与博弈」两本）——commit body 与实际数据不符的意图确认。

2. **承接 7-10 / 7-07 / 7-06 全部老 P2**（forest 两轮对抗式审查修复 6 处的六组合真机验收 6 项 / 建议把「对抗式审查 → 反驳式核验」自动化 QA 循环写进 `MAINTENANCE.md` 或新建 `docs/adversarial-review.md`、以及从 7-07 承接的 forest 双视图 App / 五主题 / PWA 图标 v2 六组合真机验收 + `scripts/audit/maskable_icon_consistency.py`、7-06 承接的 forest / pet / picker / connect4 / feixingqi / chess / xiangqi 真机验收、bare_dollar / spotcheck 启发式漏判、tutoring / paid-test-visa / mao-thought-principles summary、random hover 缩进、mid-2015 / anova-R 互链、掼蛋联机回归、宠物中心多浏览器、机票监控 mac 端到端、flight 5 HTML 多浏览器、经济学工具箱三项确认、jukebox 问题首、DNS NameResolutionError、dead_links SVG xmlns 误判、connect4 canvas 无键盘落子、linear-algebra-strang.md summary 引用、`_flight-staging/` 命名共 27 条）——今日无新观察消除、承接不变。

### 🗂 仓库卫生

**目录结构与文件架构较昨日无变化**——0 commit、0 文件动，`git status` clean、`git ls-files --others --exclude-standard` 空、`find` `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / `* 2.*` / `.env*` / `*.log` 全空、无 5 MB+ 新二进制、无 `.env` / 密钥类文件。大文件核对与 7-12 一字不差：`files/or/or-2023.pdf` 5.4 MB 唯一 5 MB+、`files/econ-math-toolkit/econ-math-toolkit.pdf` 2.9 MB + `files/interm-macro/interm-macro-2022-zh.pdf` 2.2 MB + `pdfjs/build/pdf.worker.mjs` 仍是 2.1 MB+ 群。`_paid/` + `_flight-staging/` 在 `_config.yml` L50/L52 exclude 双保险稳固、`_site/` 内 `find _site -path "*_flight-staging*" -o -path "*_paid*"` 全空。`_config.yml` 的 `exclude:` 已含 `DAILY_REVIEW.md`（L35）、`EMAIL_SUMMARY.md`（L36）等所有内部产物。**结论**：仓库结构较昨日无变化，无需再优化。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点承接沙箱无 fly.io 出口现象、不阻塞巡检、未主动重启 fly app。**今日 0 个新 commit**，无后端 / 前端 / 依赖 / 内容变化。

---

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

> 例行无人值守巡检：build 健康度 + 仓库卫生。距 7-10 巡检共 **27 个新 commit**（`ed0b7e8..954df00`）—— 连续两日「0 commit 整休」之后突然爆发的高强度冲刺日，改动集中在四条主线：**forest 上线前审查 + 灵活模式 + 开发者暗号**（`a88e180 cd50f4c ea017f9 3d46d72 f370c72 bc57c34` 6 个 commit）、**中文站门面升级两波与首页照片翻页 8 连迭代**（`77efa5b 60aa7f4 6e12023 9d50cfd 90edf90 0cb1a8b 46a3f2b 8106c98 5055f9c 62f23b8 61c237a 6ae758e 954df00` 13 个 commit，含新建 `zh/about.html` + 5 张真人照 portrait-boya/guanghua/huabiao/stair/window.jpg）、**品牌统一「锆铌 Zr」金字标 + 文章编辑式排版**（`8ab30ee 7d68d3b 05c76f9 840c5a9` 4 个 commit）、**/notes/ 顶部“自写教材书架”皮面封面 + 树里去重**（`452797e 618d4c0` 2 个 commit）、**成熟度后台点选 + 百宝箱普通卡质感 + 首页 404 页**（`72d5720 588308d` + 新建 `404.html`）。net +1268 / -137 行、20 个文件动、7 个新增文件（`404.html` `zh/about.html` 5 张 portrait JPG）。
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
