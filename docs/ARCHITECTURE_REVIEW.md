# 博客架构审查 & 改进建议（2026-05-14 起草 / 2026-05-20 状态更新）

> 写给未来接手的人（人或 AI）：这份文档详细记录了每条建议的**具体改法**和**为什么不能乱动**，以及一次失败改动的完整复盘。

## 当前状态（2026-05-20）

**所有原 2026-05-14 列出的宏观 + 微观建议已全部落地**：

| 建议 | 状态 | 落地证据 |
|---|---|---|
| 1. CSS 提取到外部文件 | ✅ 已完成（2026-05-19） | `assets/css/main.css`（635 行）+ `assets/css/home.css`（308 行），`_layouts/default.html:37` 和 `index.html:6` 引外部 link |
| 2. Front-matter 字段体系统一 | ✅ 已完成 | 见 [项目记忆 project_taxonomy_conventions](file:///Users/zhourui/.claude/projects/-Users-zhourui-Desktop-zirconeey-github-io/memory/project_taxonomy_conventions.md) |
| 3. GitHub Pages Jekyll 版本漂移 | — | 接受现状（差异极小，本地 4.3 vs Pages 3.10） |
| 4. `/notes/` 页面性能优化 | — | 当前规模够用 |
| 5. Service Worker 离线策略精简 | — | 当前 SW 工作正常 |
| 6. `_config.yml` 死 permalink | ✅ 已删 | 现 `_config.yml` 无 `permalink: /posts/...` |
| 7. `index.html` Liquid 循环优化 | ✅ 已完成 | `index.html:8-33` 单循环结构 |
| 8. `search.json` concat 清理 | ✅ 已完成 | `search.json:5` 直接 `site.notes` |
| 9. RSS Feed + Sitemap | ✅ 已完成 | `_config.yml` plugins / `Gemfile` 已加；`_site/feed.xml` + `_site/sitemap.xml` 生成 |
| 10. LaTeX 渲染抽 include | ✅ 已完成 | `_includes/latex-logo.html` + 12 处 call site 全部用 include |
| 11. PWA Manifest icons | ✅ 已完成 | `manifest.json` 现有 `any` + `maskable` 双 icon |

**仍未做的**：`.git` 历史瘦身（300M，需 force-push 改写历史，详见 [项目记忆 project_repo_hygiene](file:///Users/zhourui/.claude/projects/-Users-zhourui-Desktop-zirconeey-github-io/memory/project_repo_hygiene.md)）。

---

## 目录

1. [整体架构速览](#整体架构速览)
2. [宏观建议](#宏观建议)
3. [微观建议](#微观建议)
4. [失败复盘：CSS 提取是怎么改崩的](#失败复盘css-提取是怎么改崩的)
5. [安全改动清单（随手就能做的）](#安全改动清单随手就能做的)

---

## 整体架构速览

| 维度 | 现状 |
|---|---|
| 静态站点生成器 | Jekyll 4.3 (本地) / GitHub Pages 用 3.10 |
| 内容存储 | 全部在 `_notes/` collection（245 个 .md），没有用 `_posts/` |
| 分类体系 | 两套：学习资料用 `discipline` + `course` + `material_type`；生活/科研/随笔用 `main_category` + `sub_category` |
| CSS | 已抽到外部文件：`assets/css/main.css`（635 行）+ `assets/css/home.css`（308 行），可跨页缓存 |
| Service Worker | `sw.js`（~280 行）+ `default.html` 里的前端代码（原 ~350 行），实现全站离线缓存 + 自动预取 + 设置面板 |
| 工具箱 | `toolbox/` 下 45 个 HTML 文件，由 `_data/toolbox.yml` 注册 |
| 部署 | push 到 `main` → GitHub Pages 自动构建部署 |
| 英文学术站 | `en/` 目录 → CI sync 到独立仓库 `ruizhou03.github.io` |

---

## 宏观建议

### 1. CSS 架构碎片化 → 抽成外部文件

**问题**：`_layouts/default.html` 第 37–543 行有一个 `<style>` 块（~500 行），`index.html` 第 6–66 行和第 155–391 行各有一个 `<style>` 块（合计 ~330 行）。这些 CSS 内嵌在 HTML 里，每个页面都原样传输一份，浏览器无法跨页面缓存。

**目标**：保持样式不变，换成 `<link rel="stylesheet">` 引入外部 CSS 文件。

**具体改法**：

1. **创建 `assets/css/main.css`**：把 `default.html` 里 `<style>` 和 `</style>` 之间的内容（第 38–542 行）原样拷贝进去。注意这个 CSS 块里没有 Liquid 变量，直接拷贝即可。

2. **创建 `assets/css/home.css`**：把 `index.html` 里两个 `<style>` 块的内容合并拷贝进去。

3. **替换 `default.html` 的 `<style>` 块**：
   - 删除第 37 行 `<style>` 到第 543 行 `</style>`（包含 `</style>` 标签本身）
   - 在同样位置插入：`<link rel="stylesheet" href="{{ '/assets/css/main.css' | relative_url }}">`
   - **关键**：这一行后面的 `<link rel="stylesheet" href="https://unpkg.com/@waline/client@v2/dist/waline.css" />` 不能动！它在 `<style>` 块外面。

4. **替换 `index.html` 的两个 `<style>` 块**：
   - 第一个块（第 6–66 行）：删除整个 `<style>...</style>`，在 front-matter 下方插入 `<link rel="stylesheet" href="{{ '/assets/css/home.css' | relative_url }}">`
   - 第二个块（原第 155–391 行）：**整个删除**，不需要再插入任何东西
   - **不能**删一半留一半，也不能把 `<style>` 标签留下

**正确操作顺序**（每步都 build 验证）：

```
Step 1: 创建 assets/css/main.css → bundle exec jekyll build → 确认无报错
Step 2: 只改 default.html，替换 style 块 → build → 打开首页看样式
Step 3: 创建 assets/css/home.css → build
Step 4: 只改 index.html，删第一个 style 块并插入 link → build → 看首页
Step 5: 删第二个 style 块 → build → 最终验证
```

**为什么这一步容易崩**（见[失败复盘](#失败复盘css-提取是怎么改崩的)）：涉及大段文本删除 + 两个文件同时改动，任何一步的行号偏移都会连锁出错。

**风险等级**：⚠️ 中高（操作多，但逻辑简单）

---

### 2. Front-matter 字段体系统一

**问题**：目前 `_notes/` 里的 .md 文件有两种分类字段体系：

| 内容类型 | 使用的字段 | 文件数 |
|---|---|---|
| 学习资料 (study/) | `discipline` + `course` + `material_type` | ~100 |
| GRE/TOEFL/高中辅导 | `discipline` + `course` + `material_type` | ~23 |
| 课程测评 (course-reviews/) | `discipline` + `course` + `material_type` + `review_category` + `semester` | ~18 |
| 生活/科研/随笔 | `main_category` + `sub_category` | ~88 |

**后果**：`search.json` 的 category 拼接逻辑写了 40 行 Liquid 来处理三种模式；`index.html` 首页计数要分别 `where: "main_category"` 和 `where_exp: "extra_categories contains"`。

**目标**：所有文件统一拥有 `main_category` + `sub_category`，旧字段 (`discipline`, `course`, `material_type`) 保留不删。

**具体改法**：

1. **找出所有缺少 `main_category` 的文件**：
   ```bash
   for f in $(grep -rl "discipline:" _notes/); do
     if ! grep -q "main_category:" "$f"; then echo "$f"; fi
   done
   ```
   预期结果：~113 个文件。

2. **批量添加字段**（用 Python 脚本，不要手动改 113 次）：
   - 对每个文件，在 `layout:` 行之后插入两行：
     ```yaml
     main_category: "学习资料"
     sub_category: "<course 字段的值>"
     ```
   - 脚本关键点：
     - 用正则 `^layout:\s*.+$` 定位插入位置
     - 用正则 `^course:\s*(.+)$` 提取课程名
     - 如果 `course` 值带引号，用 `.strip().strip('"')` 去掉
     - 写入时保持 UTF-8 编码

3. **验证**：
   ```bash
   bundle exec jekyll build  # 确认编译通过
   grep -c "main_category:" _notes/study/*/**.md  # 确认每份都有
   ```

4. **可选的后续优化**（不急着做）：
   - `/notes/index.html` 可以改用 `main_category: "学习资料"` 过滤
   - `index.html` 首页可以统一用 `where: "main_category"` 计数
   - `search.json` 的 category 拼接可以简化

**风险等级**：🟢 低（纯增字段，不改删除，不影响已有查询）

---

### 3. GitHub Pages Jekyll 版本漂移

**问题**：本地用 Jekyll 4.3，GitHub Pages 跑 Jekyll 3.10。目前差异不大，但未来如果想加插件（比如 `jekyll-sitemap`、`jekyll-feed`），需要确认 GitHub Pages 白名单是否支持；或者彻底迁移到 GitHub Actions 部署，不再依赖 GitHub Pages 内置的 Jekyll。

**方案 A**：保持 GitHub Pages 内置构建，只加白名单插件

- `jekyll-sitemap`：✅ 在白名单
- `jekyll-feed`：✅ 在白名单
- `jekyll-seo-tag`：✅ 已在用
- 其他不在白名单的插件不能用

改 `_config.yml`：
```yaml
plugins:
  - jekyll-feed
  - jekyll-seo-tag
  - jekyll-sitemap
```

改 `Gemfile`，加上：
```ruby
gem 'jekyll-sitemap'
gem 'jekyll-feed'
```

`jekyll build` 后会生成 `/feed.xml` 和 `/sitemap.xml`。

**方案 B**：迁移到 GitHub Actions 部署

- 创建 `.github/workflows/deploy.yml`，用 `actions/jekyll-build-pages@v1` 或手动 `setup-ruby` + `bundle exec jekyll build`
- 好处：完全控制 Jekyll 版本，可以加任意插件
- 坏处：多一个 CI 配置文件需要维护

**风险等级**：方案 A 🟢 极低，方案 B ⚠️ 中

---

### 4. `/notes/` 页面性能优化

**问题**：`/notes/index.html` 用 `<details>` 折叠手风琴渲染全部 24 门课程、100+ 条资料。DOM 里一次性渲染了所有内容，移动端加载时全部在内存里。

**具体改法**：

在 `notes/index.html` 的 `<header>` 下方加一个搜索输入框：

```html
<div class="kb-search-wrap">
  <input type="search" id="kb-search" class="kb-search-input"
         placeholder="搜索课程名或学科…" aria-label="搜索课程" />
</div>
```

CSS：
```css
.kb-search-wrap { margin-top: 1.2rem; }
.kb-search-input {
  width: 100%; max-width: 360px;
  padding: 0.55rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 20px;          /* 与全站搜索框风格统一 */
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 0.92rem;
  outline: none;
  transition: border-color 0.2s;
}
.kb-search-input:focus { border-color: var(--color-accent); }
.course-block.kb-hidden { display: none; }
```

JS 过滤逻辑：
```javascript
(function() {
  var input = document.getElementById('kb-search');
  if (!input) return;
  input.addEventListener('input', function() {
    var q = this.value.trim().toLowerCase();
    var blocks = document.querySelectorAll('.course-block[data-search]');
    blocks.forEach(function(b) {
      var txt = (b.getAttribute('data-search') || '').toLowerCase();
      b.classList.toggle('kb-hidden', q && txt.indexOf(q) === -1);
    });
  });
})();
```

给每个 `details.course-block` 加 `data-search` 属性（Jekyll 模板里）：
```html
<details class="course-block" data-search="{{ first_note.course | default: folder }} {{ first_note.discipline | default: '' }}">
```

**改完后**：用户打几个字就能筛出目标课程，不用展开全部手风琴。

**风险等级**：🟢 低（纯客户端 JS，不影响服务端渲染）

---

### 5. Service Worker 离线策略精简

**问题**：当前 SW 系统包含三层：
1. 基础缓存策略（network-first for HTML, stale-while-revalidate for assets）— 这些是核心，保留
2. 自动预取（idle scheduling + `offline-manifest.json` + 全站后台缓存）— 用户感知低，代码量最大
3. UI 层（进度条 pill + 设置面板 dialog + “离线缓存”链接）— 对博客场景过度设计

**目标**：保留第 1 层核心缓存 + 手动下载按钮，砍掉第 2、3 层。

**具体改法**：

**`_layouts/default.html`** 里要删的东西：

1. **进度条**：删除 `id="offline-pill"` 的 `<div>`（原第 627–636 行附近）
2. **设置面板**：删除 `id="offline-settings-dialog"` 的 `<dialog>`（原第 639–675 行附近）
3. **页脚链接**：把 `<a id="offline-settings-link">离线缓存</a>` 改成静态文字 `<span>离线</span>`
4. **JS 块精简**：把 SW 相关的 IIFE（原第 711–1064 行）替换成精简版：

```javascript
(function () {
  if (!('serviceWorker' in navigator)) return;
  const SW_URL = '{{ "/sw.js" | relative_url }}';
  const SCOPE = '{{ "/" | relative_url }}';
  const statusDot = document.getElementById('offline-status-dot');

  function liveVersion() {
    const m = document.querySelector('meta[name="zircon-page-version"]');
    return m ? m.getAttribute('content') : null;
  }

  function postToSW(reg, payload, timeoutMs) { /* 保持不变，略 */ }

  async function refreshPageStatus(reg) { /* 只查当前页缓存状态 */ }

  function applyStatus(state, cachedAt) {
    // 更新状态指示灯 + post.html 的 📥 按钮文字
  }

  window.__zirconRefreshOfflineStatus = () => refreshPageStatus();

  window.addEventListener('load', async () => {
    await navigator.serviceWorker.register(SW_URL, { scope: SCOPE });
    const reg = await navigator.serviceWorker.ready;
    // 等 SW 接管后刷新状态
    setTimeout(() => refreshPageStatus(reg).catch(() => {}), 800);
    // ⚠️ 不再调用 scheduleIdle(runAutoPrefetch)
  });
})();
```

**`sw.js`** 可以不动（`PREFETCH_URLS` handler 仍被 post.html 和 listing 页的手动下载按钮使用）。

**删除后要删掉没用的 DOM 引用**：`pill`、`dialog`、`settingsLink`、`cachedCountEl`、`totalCountEl`、`autoToggle`、`recacheBtn`、`clearBtn`、`closeBtn` 这些变量全部移除。

**风险等级**：⚠️ 中高（涉及 SW 核心逻辑，要确保手动下载按钮不依赖被删的函数）

---

## 微观建议

### 6. 删除 `_config.yml` 里的死配置

**文件**：`_config.yml`

**改法**：删除这一行：
```yaml
permalink: /posts/:year-:month-:day-:title/
```

**原因**：这个 permalink 只对 `site.posts` 生效，但本站没有 `_posts/` 目录。所有内容都在 `site.notes` 里用显式 `permalink` front-matter。

**风险等级**：🟢 零风险

---

### 7. `index.html` Liquid 循环优化

**文件**：`index.html` 第 68–82 行

**问题**：首页计数用了 6 次 `where` / `where_exp` 过滤，每次遍历全部 229 条 notes。虽然目前构建时间只有 3 秒，但逻辑上是不必要的重复。

**改法**：用一个 `{% for n in site.notes %}` 循环完成所有计数：

```liquid
{% assign total = 0 %}
{% assign notes_count = 0 %}
{% assign research_count = 0 %}
{% assign life_count = 0 %}
{% assign essay_count = 0 %}
{% assign valid_notes = "" | split: "" %}

{% for n in site.notes %}
  {% if n.published != false %}{% assign total = total | plus: 1 %}{% endif %}
  {% if n.date %}{% assign valid_notes = valid_notes | push: n %}{% endif %}
  {% if n.discipline %}{% assign notes_count = notes_count | plus: 1 %}{% endif %}
  {% if n.main_category == "科研妙招" or n.extra_categories contains "科研妙招" %}
    {% assign research_count = research_count | plus: 1 %}
  {% endif %}
  {% if n.main_category == "生活攻略" or n.extra_categories contains "生活攻略" %}
    {% assign life_count = life_count | plus: 1 %}
  {% endif %}
  {% if n.main_category == "随笔漫谈" or n.extra_categories contains "随笔漫谈" %}
    {% assign essay_count = essay_count | plus: 1 %}
  {% endif %}
{% endfor %}

{% assign all_content = valid_notes | sort: "date" | reverse %}
{% assign hot_posts = all_content | where: "hot", true %}
{% assign featured = hot_posts | first %}
```

**注意**：`valid_notes` 需要初始化为 `"" | split: ""`（创建空数组），才能在循环里 `push`。

**风险等级**：🟢 低（逻辑等价，只是减少遍历次数）

---

### 8. `search.json` 去掉无意义的 concat

**文件**：`search.json` 第 4 行

**改法**：
```liquid
<!-- 之前 -->
{% assign items = site.posts | concat: site.notes %}

<!-- 之后 -->
{% assign items = site.notes %}
```

**原因**：`site.posts` 永远是空的（没有 `_posts/` 目录）。

**风险等级**：🟢 零风险

---

### 9. 添加 RSS Feed 和 Sitemap

**文件**：`_config.yml`、`Gemfile`

**改法**：

`_config.yml`：
```yaml
plugins:
  - jekyll-feed
  - jekyll-seo-tag
  - jekyll-sitemap
```

`Gemfile`：
```ruby
gem 'jekyll-sitemap'
gem 'jekyll-feed'
```

执行 `bundle install && bundle exec jekyll build`，确认 `/feed.xml` 和 `/sitemap.xml` 生成。

**对 SEO 的影响**：sitemap.xml 帮搜索引擎发现全部 229 篇文章；feed.xml 让读者可以用 RSS 阅读器订阅。

**风险等级**：🟢 零风险（GitHub Pages 白名单插件）

---

### 10. 抽象 `LaTeX` 渲染逻辑

**问题**：以下 6 个文件各自写了同样的大段 Liquid：

```
{{ post.title | replace: 'LaTeX', 'L<span class="latex-a">a</span>T<span class="latex-e">e</span>X' }}
```

分布位置：
- `index.html` 第 596 行（featured card）
- `index.html` 第 622 行（post list）
- `_layouts/post.html` 第 11 行（TOC 标题）
- `_layouts/post.html` 第 23 行（文章标题）
- `_includes/sub-category-section.html` 第 37 行（列表项）
- `_includes/yearly-story-section.html` 第 44 行（年度卡片）

另外以下文件也需要加上（目前缺了 LaTeX 渲染）：
- `notes/index.html` 第 82 和 115 行
- `notes/course-reviews/index.html` 第 70 行
- `notes/toefl-gre/index.html` 第 68 行
- `notes/tutoring/index.html` 第 68 行
- `life/recipes/index.html` 第 240 行

**改法**：

1. 创建 `_includes/latex-logo.html`：
```liquid
{%- comment -%}渲染标题中的 LaTeX logo{%- endcomment -%}{{ include.title | replace: 'LaTeX', 'L<span class="latex-a">a</span>T<span class="latex-e">e</span>X' }}
```

2. 所有出现 `{{ xxx.title | replace: 'LaTeX', 'L<span...' }}` 的地方改为：
```liquid
{% include latex-logo.html title=xxx.title %}
```

3. 对于使用了 `| default` 管道的情况（如 `notes/index.html` 的 `item.list_title | default: item.title`），**不能**直接在 include 参数里写 filter。要先 assign：
```liquid
{% assign _disp_title = item.list_title | default: item.title %}
{% include latex-logo.html title=_disp_title %}
```

**CSS 无需动**：`.latex-a` 和 `.latex-e` 的样式已经存在于 `_layouts/default.html` 里。

**风险等级**：🟢 低（逻辑等价，只是收敛到一处）

---

### 11. PWA Manifest 图标完善

**文件**：`manifest.json`

**问题**：当前只声明了一个 SVG icon，`sizes: "any"`。对 Chrome/Edge 没问题，但对部分 Android 启动器 / iOS 添加到主屏幕的场景，建议提供 maskable 版本。

**改法**：把 `manifest.json` 的 `icons` 数组改成：

```json
"icons": [
  {
    "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect width='512' height='512' rx='64' fill='%231e3a5f'/><text x='256' y='380' font-family='Georgia, serif' font-size='380' font-weight='bold' fill='%23c9a96e' text-anchor='middle'>Zr</text></svg>",
    "sizes": "512x512",
    "type": "image/svg+xml",
    "purpose": "any"
  },
  {
    "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect width='512' height='512' rx='64' fill='%23fafaf9'/><text x='256' y='380' font-family='Georgia, serif' font-size='380' font-weight='bold' fill='%23c9a96e' text-anchor='middle'>Zr</text></svg>",
    "sizes": "512x512",
    "type": "image/svg+xml",
    "purpose": "maskable"
  }
]
```

关键变化：
- `viewBox` 从 `0 0 100 100` 改成 `0 0 512 512`
- `sizes` 从 `"any"` 改成 `"512x512"`（明确尺寸）
- 添加 `rx='64'` 圆角背景
- 添加 `purpose: "maskable"` 版本（浅底 + 深色文字）

**风险等级**：🟢 极低（inline SVG，无外部依赖）

---

## 失败复盘：CSS 提取是怎么改崩的

### 时间线

| 步骤 | 做了什么 | 结果 |
|---|---|---|
| 1 | 创建 `assets/css/main.css`、`assets/css/home.css` | ✅ 文件创建成功 |
| 2 | 用 Edit 工具删除 `default.html` 的 `<style>` 块，替换为 `<link>` | ✅ 成功（块边界清晰，一次性匹配） |
| 3 | 用 Edit 工具删除 `index.html` 第一个 `<style>` 块 | ✅ 成功 |
| 4 | 用 Edit 工具删除 `index.html` 第二个 `<style>` 块 | ❌ **崩在这里** |
| 5 | `sed -i '' '95,330d'` 清理孤儿 CSS | ❌ 行号已偏移，删错内容 |
| 6 | `bundle exec jekyll build` | ⚠️ 编译通过 ≠ 样式正确 |

### 根因分析

**错误 1：Edit 工具的部分匹配**

第二个 `<style>` 块有 ~235 行 CSS。我试图用 Edit 工具一次性替换整个块，但 old_string 只写了开头的 3 行：

```
</section>

<style>
  #react-widget {
```

new_string 写成了：

```
</section>

<div class="right-stack-top">
```

Edit 工具找到匹配后，只替换了这 3 行。`<style>` 块的剩余 232 行 CSS 仍然留在文件里，夹在 `<div class="right-stack-top">` 和原来的 `<div class="right-stack-top">` 之间：

```html
<!-- 替换后 -->
<div class="right-stack-top">           <!-- 来自 new_string -->
    background: var(--color-bg-warm);    <!-- 孤儿 CSS！ -->
    border: 1px solid var(--color-border);
    ...
  #rw-feedback { ... }
</style>                                 <!-- 孤儿 </style> -->

<div class="right-stack-top">           <!-- 原来的 HTML -->
  <a href="..." class="announcement-side">
```

结果：HTML 结构被破坏，CSS 变成了 DOM 内容。

**教训**：用 Edit 工具做大块替换时，**old_string 必须完整包含整个要删除的块**。如果块太长（>200 行），要么分步操作，要么用 Bash 的 sed 但必须先验证行号。

**错误 2：`sed -i` 依赖动态行号**

发现孤儿 CSS 后，我用 `grep -n` 找到残留的 `<style>` 标签行号，然后 `sed -i '' '95,330d'` 删行。但此时文件已经被前几步 Edit 操作修改过，行号是动态的。

**教训**：绝对不要用 `sed -i` + 硬编码行号。如果必须用 sed，用模式匹配：
```bash
sed -i '' '/<style>/,/<\/style>/d' file.html
```
但这也会删掉所有 `<style>` 块。更好的做法是用 Python 脚本精确操作 AST 或至少用正则。

**错误 3：一次性改了 10 项再验证**

CSS 提取、SW 精简、front-matter 统一、Liquid 优化、搜索 JSON 修复、sitemap/feed 添加、LaTeX 抽象、manifest 更新——全部做完才 build。

**教训**：每一步改完立即 `bundle exec jekyll build && git diff --stat` 确认改动范围。出问题时能立刻定位到是哪个改动引起的。

**错误 4：把 `</style>` 后面的 Waline CSS 也删了**

在替换 `default.html` 的 `<style>` 块时，我忘记 `<style>` 的 `</style>` 后面紧跟着：
```html
<link rel="stylesheet" href="https://unpkg.com/@waline/client@v2/dist/waline.css" />
```

虽然最后修了回来，但如果没注意到，会导致所有文章的评论区样式丢失。

**教训**：替换前读清目标块前后各 3-5 行上下文。

### 正确做法 Checklist

大规模 CSS 重构的安全流程：

- [ ] 先 `git checkout -b css-extract` 开分支
- [ ] 在分支上操作，崩了随时 `git checkout main`
- [ ] 每改完一个文件 → `jekyll build` → 确认无报错
- [ ] 打开 `_site/index.html`，肉眼检查 `<style>` 和 `<link>` 标签数量是否正确
- [ ] 用 `grep -c "<style>"` 验证（index.html 从 2 变 0，default.html 从 1 变 0）
- [ ] 用 `grep -c "main.css\|home.css"` 验证（各出现 1 次）
- [ ] 本地 `jekyll serve` 打开浏览器实际看
- [ ] 确认无误后再 merge 到 main

---

## 安全改动清单（随手就能做的）

下面这些改法**绝对不会崩**，每一项都是单文件、小改动：

1. **_config.yml**：删 `permalink` 行，加 `jekyll-feed` 和 `jekyll-sitemap` 到 plugins 列表
2. **Gemfile**：加 `gem 'jekyll-sitemap'` 和 `gem 'jekyll-feed'`
3. **search.json**：`site.posts | concat: site.notes` → `site.notes`
4. **manifest.json**：替换 `icons` 数组（见建议 11）
5. **index.html**：Liquid 循环优化（见建议 7）
6. **_includes/latex-logo.html**：创建 + 逐个替换引用（见建议 10）

做完一项 commit 一项，不要攒着一起推。
