#!/bin/zsh
# 本地预览常驻服务器 —— ruizhou03.github.io
# 由 LaunchAgent com.ruizhou03.site-preview 开机拉起、崩溃自动重启。
# 访问 http://localhost:4000 即可看到当前工作区的实时效果（自动重建 + livereload 自动刷新）。
#
# 为什么需要它：见同目录 README.md。简言之——线上有 PWA Service Worker + CDN
# 三层缓存，"推上去 + 硬刷新"常看不到最新；本地预览全绕开，且本地不挂 SW。
#
# 安装/重装：运行同目录 install.sh。
# 改了 _config.yml 后需重启（Jekyll 不自动重载 config）：
#   launchctl kickstart -k gui/$(id -u)/com.ruizhou03.site-preview

# UTF-8 locale 必须显式设：LaunchAgent 环境极干净，缺它 Ruby 默认 US-ASCII，
# Jekyll 一遇中文文件名/正文就 "invalid byte sequence in US-ASCII" 崩。
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Homebrew 的 ruby 是 keg-only（不软链进 brew bin），必须显式把 ruby 与其
# gem 可执行目录加进 PATH，否则 launchd 干净环境里找不到 ruby/bundle/jekyll。
BREW=""
for b in /opt/homebrew/bin/brew /usr/local/bin/brew; do
  [ -x "$b" ] && BREW="$b" && break
done
if [ -n "$BREW" ]; then
  RUBY_BIN="$("$BREW" --prefix ruby 2>/dev/null)/bin"
  GEM_BIN=""
  [ -x "$RUBY_BIN/gem" ] && GEM_BIN="$("$RUBY_BIN/gem" environment gemdir 2>/dev/null)/bin"
  export PATH="$RUBY_BIN:$GEM_BIN:$("$BREW" --prefix)/bin:/usr/bin:/bin:/usr/sbin:/sbin"
else
  export PATH="/usr/bin:/bin:/usr/sbin:/sbin"
fi

# 站点仓库路径：优先用 plist 注入的 SITE_REPO；否则按本脚本所在位置推断
# （本脚本位于 <repo>/scripts/local-preview/ 时，../.. 即仓库根）。
SITE_REPO="${SITE_REPO:-$(cd "${0:A:h}/../.." 2>/dev/null && pwd)}"
PREVIEW_PORT="${PREVIEW_PORT:-4000}"

cd "$SITE_REPO" || { echo "[local-preview] 站点仓库不存在: $SITE_REPO" >&2; exit 1; }
exec bundle exec jekyll serve --livereload --host 127.0.0.1 --port "$PREVIEW_PORT"
