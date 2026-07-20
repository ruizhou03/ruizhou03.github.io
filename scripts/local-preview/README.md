# 本地预览常驻服务（local-preview）

让 **http://localhost:4000** 开机自启、常驻可用——任何时候打开就能看到站点当前工作区的实时效果，
不用等 GitHub Pages 部署、不用跟浏览器/CDN/Service Worker 缓存搏斗。

## 为什么需要这个

本站是 PWA，线上有三层缓存会让“改完看不到最新”：

1. **GitHub Pages 部署延迟** —— push 后要等构建。
2. **GitHub Pages CDN（Fastly）** —— `Cache-Control: max-age=600`，HTML/资源边缘缓存最多 10 分钟。
3. **Service Worker（`/sw.js`）** —— 静态资源用 stale-while-revalidate：先吐旧版、后台再换，
   要第二次加载才生效；而硬刷新（Cmd+Shift+R）绕不开 SW 这层。

本地预览把这三层全绕开，是日常看效果最快、最准的方式。

整套“不再跟缓存搏斗”由三件事组成（本目录只负责第 3 件）：

| | 做了什么 | 在哪 |
|---|---|---|
| 1. SW localhost 守卫 | localhost/127.0.0.1 不注册 SW 并清掉已注册的，**保证本地永远是最新** | `_layouts/default.html` SW 注册处 |
| 2. 资源版本号 | 全站首方 CSS/JS 自动带 `?v={{ site.time }}`，部署后**线上第一次加载即新版** | 各模板/页面的 `<link>/<script>`（约定：新增首方资源也要带） |
| 3. 常驻预览服务 | 开机自启 `jekyll serve --livereload`，常驻 localhost:4000 | **本目录** |

> 新增任何首方 `<link>/<script>`（新工具页/新游戏/新 JS）都要照抄 `?v={{ site.time | date: '%s' }}`，
> 否则又会被 SW 拖成旧版。第三方 CDN（jsdelivr/unpkg/cdnjs）跨域、SW 本就透传，不用加。

## 文件

- `jekyll-local-preview.sh` —— 启动包装脚本：设好 UTF-8 locale 和 PATH（LaunchAgent 环境极干净，
  缺 UTF-8 会让 Jekyll 因中文内容崩；Homebrew 的 ruby 是 keg-only 需显式加 PATH），然后
  `bundle exec jekyll serve --livereload --host 127.0.0.1 --port 4000`。
- `com.ruizhou03.site-preview.plist` —— LaunchAgent 模板（含 `__WRAPPER__`/`__SITE_REPO__` 占位符，
  由 install.sh 替换；**勿直接加载本模板**）。`RunAtLoad` + `KeepAlive` = 开机自启 + 崩溃自动重启。
- `install.sh` —— 一键安装/重装（幂等）。

## 在新机器上复现

```bash
# 前置：已装 Homebrew + ruby + bundle，且在仓库根跑过 bundle install
zsh scripts/local-preview/install.sh
```

它会把包装脚本装到 `~/scripts/`，生成填好绝对路径的 plist 到 `~/Library/LaunchAgents/`，
bootstrap 加载，并等 `http://localhost:4000` 起来。

## 日常使用

- **看效果**：浏览器开 http://localhost:4000 即可，改完自动重建 + 自动刷新。
- **改了 `_config.yml` 之后**（Jekyll 不自动重载 config，必须重启）：
  ```bash
  launchctl kickstart -k gui/$(id -u)/com.ruizhou03.site-preview
  ```
- **查状态 / 排错**：
  ```bash
  launchctl print gui/$(id -u)/com.ruizhou03.site-preview   # 状态/pid
  tail -f /tmp/ruizhou03-jekyll-preview.err.log             # 日志
  ```
- **卸载**：
  ```bash
  launchctl bootout gui/$(id -u)/com.ruizhou03.site-preview
  rm ~/Library/LaunchAgents/com.ruizhou03.site-preview.plist
  ```

## localhost 看不准 / 看不到的几类（要看线上）

- **SW / 离线 / 缓存行为本身** —— 本地故意关了 SW，测不了。
- **后端联机功能**（评论、排行榜、登录、cloud-sync、小助手）—— 样子能看，
  但联机行为可能因跨域/origin 校验跟线上不同甚至失效。
- **线上能否 build** —— 本地是 Jekyll 4，线上是 GitHub Pages 的 Jekyll 3 / Liquid 3，
  改 `_layouts`/`_includes`/Liquid 后本地能渲染 ≠ 线上能 build，推后要看 Pages 构建状态。
- **绝对网址**（og:image / canonical / sitemap）—— 本地会显示成 `localhost:4000/...`。

口诀：**「长什么样」看 localhost，「联机/缓存/能不能 build」看线上。**
