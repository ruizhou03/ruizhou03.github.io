# 维护手册

合并后的**单仓库双语站**维护说明。核心一句话:**一个 Jekyll 仓库,英文当门面,中文在 `/zh/`。**

## 架构速览

2026-05 之前是两个独立仓库(中文 `zirconeey.github.io`、英文 `ruizhou03.github.io`)靠一个 GitHub Action 单向同步。现已合并:**全站只有一个 Jekyll 仓库**,部署在 `ruizhou03/ruizhou03.github.io`,对外域名 `https://ruizhou03.github.io`。

```
ruizhou03.github.io/         英文学术主页   = 仓库根 index.html(独立整页 HTML)
ruizhou03.github.io/zh/      中文博客首页   = zh/index.html
ruizhou03.github.io/en/      noindex 跳转 stub → /(保留旧 /en/ 链接不失效)
ruizhou03.github.io/notes/  /life/  /research/  /essays/  /toolbox/ ...   中文内容
```

- **英文主页** = 仓库根 `index.html`,一整页手写 HTML,**不走 Jekyll layout**,自带 `<head>`/导航/CSS。
- **中文站** = 标准 Jekyll,所有内容在 `_notes/` collection,套 `_layouts/default.html`。
- **语言切换**:英文页右上角「中文」→ `/zh/`;中文页导航栏「EN」→ `/`。
- **旧 `zirconeey.github.io`**:仓库保留,内容换成一个按路径转发到新域名的跳转页,旧二维码 / 公众号旧链接靠它不失效。

没有同步 Action 了,没有「源仓库 / 镜像仓库」之分了,只有这一个仓库。

## 本机与远程的一点历史包袱

- 本机仓库文件夹仍叫 `zirconeey.github.io`,`.claude/` 里的钩子、`scripts/` 里的 `REPO=` 路径、LaunchAgent 的 `io.github.zirconeey.*` 标识都还带 `zirconeey` 字样——这些是**本地标识符**,不影响线上,没必要改。
- git remote 起初指向 `zirconeey/zirconeey.github.io`;搬家后应 `git remote set-url origin git@github.com:ruizhou03/ruizhou03.github.io.git`,并确保本机 SSH key / `gh` 已登录 `ruizhou03` 账号。

## 日常:改英文主页

直接编辑仓库根 [`index.html`](../index.html)(一整页 HTML)。资产(CV PDF、头像、相册图)放 [`files/en/`](../files/en/),HTML 里用绝对路径 `/files/en/xxx`。`git commit && git push`,GitHub Pages 自动构建,约 1–2 分钟后刷新 <https://ruizhou03.github.io/>。

## 日常:改中文博客

标准 Jekyll 流程。笔记 / 文章进 `_notes/`,`push` 后 GitHub Pages 自动构建。新文章用 `/new-post` skill,菜谱用 `/recipe` skill,发布前用 `/search-keywords` 补关键词。

## 分类约定（为什么有“两套”，不是 bug）

站里所有内容都在 `_notes/` 这个 collection。**展示上分两类，是刻意的，别去统一：**

- **博客型**（生活攻略 / 科研妙招 / 随笔漫谈）：按话题和时间读。
  - 字段：`main_category`（一级栏目）+ `sub_category`（专栏分组）。
  - landing 页 = 带日期、可翻页、可搜的文章流。
- **资料型**（学习资料）：按课程查档案，下载 PDF，时间无关。
  - 字段：`discipline`（学科分组）+ `course`（课程名）+ `material_type`。
    `material_type` 合法取值两类：学术资料 `Notes` / `Exams` / `Homework`
    （模板 `post.html` 有专属文案）；非学术人面标签 `课程测评` / `经验之谈` /
    `错题本` / `写作` / `词汇` / `口语`（模板走 `{% else %}` 兜底）。新增取值前
    先想清楚是不是真有必要——`scripts/audit/material_type_enum.py` 的白名单与此同步。
  - `main_category: "学习资料"` 仍然要写——只是为了让首页“近期更新”
    和计数能统一处理；它在资料型里**不做分组用**，分组靠 `discipline`。
  - `/notes/` 页按 `discipline` 分组，组顺序由 `_config.yml` 的
    `discipline_order` 控制（思政恒在末尾）。**别再用 `discipline: 其他`**。

命名规则：课程名用中文；同一门课在多校上过才加 `（北大）`/`（PSU）` 等
后缀消歧，单校课程不加。`course` 与 `sub_category` 两字段保持一致。

PDF-only 资料不用手写正文：`post.html` 会按 `course` + `material_type`
自动生成一句客观说明；要手写就加 front-matter `summary:`，正文写了
内容就由正文接管。课程搜索别名在 `_data/course_aliases.yml`（让英文/
拼音/错别字也能搜到，key 必须和 `course` 完全一致）。

**学习资料正文密度建议**（**建议性，不是硬约束**）：

| 形态 | 建议 markdown 正文长度 | 例子 |
|------|----------------------|------|
| 期末样卷 / 一次性应试材料 | front-matter only，正文留空（让 post.html 自动导语兜底） | corp-fin/mid-sample-1.md |
| 课程章节笔记 / 主讲义 | front-matter + 一段 `summary` 字段 | real-anal-ch1-2024.md |
| 主题入门 / 思维提升类讲义 | front-matter + `summary` + 一段导语 + 章节 outline 表 | pre-high-school/physics.md |

旧文章不满足这个标准也没关系——当时是“先上架/备份”的优先级。新建（或主动想重写）时按这个梯度填即可。
不要因为旧文密度不够就否定它们的存在价值；只是日后顺手时可以补充。

一句话：**博客型用 `sub_category`，资料型用 `discipline+course`，
`main_category` 只为首页统一服务。** 加内容照这个填就不会乱。

## 后端服务

评论 / 排行榜 / 催更走两个 fly app(详见项目记忆 `reference_backend_apps`):

- **`zircon-urge`**(排行榜 / 催更 / 文末表情 / 站内助手 / relay)—— CORS 是 `Access-Control-Allow-Origin: *`,换域名**无需改动**。
- **`zircon-comments`**(Waline 评论)—— 代码里没有域名白名单,真正的闸是 Waline 的 `SECURE_DOMAINS` 环境变量。换域名后确认一次:

  ```bash
  fly secrets list --app zircon-comments     # 看有没有 SECURE_DOMAINS
  # 若有，把新域名加进去（保留旧域名让过渡期两边都能评论）：
  fly secrets set SECURE_DOMAINS="zirconeey.github.io,ruizhou03.github.io" --app zircon-comments
  ```

  若 `SECURE_DOMAINS` 根本没设,Waline 默认放行所有来源,也无需改动。

前端引用后端 URL 的位置:评论 6 处(`_layouts/post.html` ×2、`_layouts/recipe.html` ×2、`toolbox/suika/index.html`、`assets/js/games-shell/comments.js`),催更在根 `index.html` 和 `zh/index.html`,文末 reactions 在 `_layouts/post.html`。

## SEO

站内已做好的:

- 英文主页 `<head>` 里 `<link rel="canonical" href="https://ruizhou03.github.io/">`、Schema.org `Person` JSON-LD(affiliation / alumniOf / sameAs 消歧)、Open Graph + Twitter card。
- `jekyll-sitemap` 自动生成全站 `/sitemap.xml`;根 `robots.txt` 指向它;Google 站点验证文件在仓库根 `google5306d4742a3d6077.html`。

需要手动做的(站外、一次性):

1. **Google Search Console**:把 property 换成 / 新增 `https://ruizhou03.github.io/`,提交 `https://ruizhou03.github.io/sitemap.xml`。
2. **反向链接**:让 PSU 经济系 profile、导师 / co-author 主页、LinkedIn / Scholar / ORCID 的 personal website 字段、GitHub bio 都指向 `https://ruizhou03.github.io/`。反链是最强的排名信号,Google 重爬通常要 2–3 个月见效。
3. 英文主页 JSON-LD 的 `sameAs` 数组里尽量多挂研究 profile(Scholar / LinkedIn / ORCID / 系页),消歧越准。

## 延后 / 未做的事

- **买自定义域名**(如 `ruizhou.xyz`):架构支持——给 `ruizhou03.github.io` 仓库加 `CNAME` 文件即可,旧 `github.io` 变 redirect。花 ~$15/yr,暂无必要。
