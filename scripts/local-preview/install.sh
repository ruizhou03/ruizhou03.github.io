#!/bin/zsh
# 一键安装/重装本地预览常驻服务（macOS LaunchAgent）。
# 在任意机器上 clone 本仓库后运行：
#   zsh scripts/local-preview/install.sh
# 幂等：已安装会先卸载再重装。
set -e

HERE="${0:A:h}"
REPO="$(cd "$HERE/../.." && pwd)"
LABEL="com.ruizhou03.site-preview"
WRAPPER="$HOME/scripts/jekyll-local-preview.sh"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
UID_=$(id -u)

echo "[install] 仓库根: $REPO"

# 包装脚本装到 ~/scripts（仓库外，不受 git 切分支/clean 影响，更稳）
mkdir -p "$HOME/scripts" "$HOME/Library/LaunchAgents"
cp "$HERE/jekyll-local-preview.sh" "$WRAPPER"
chmod +x "$WRAPPER"
echo "[install] 包装脚本 -> $WRAPPER"

# 从模板生成 plist，填入本机绝对路径
sed -e "s#__WRAPPER__#$WRAPPER#g" -e "s#__SITE_REPO__#$REPO#g" \
  "$HERE/com.ruizhou03.site-preview.plist" > "$PLIST"
echo "[install] plist    -> $PLIST"
plutil -lint "$PLIST"

# 重载：先卸载，并等它真的从 launchd 注销干净（否则紧接着 bootstrap 会撞 EIO 竞态）
launchctl bootout "gui/$UID_/$LABEL" 2>/dev/null || true
for _ in $(seq 1 15); do
  launchctl print "gui/$UID_/$LABEL" >/dev/null 2>&1 || break
  sleep 1
done
launchctl enable "gui/$UID_/$LABEL" 2>/dev/null || true

# bootstrap，对偶发 EIO(5) 重试几次
for attempt in 1 2 3 4 5; do
  if launchctl bootstrap "gui/$UID_" "$PLIST" 2>/tmp/.lp-bootstrap.err; then
    break
  fi
  echo "[install] bootstrap 第 $attempt 次失败，重试中…"; sleep 2
done

echo "[install] 已 bootstrap，等待 http://localhost:4000 起来（首次构建较慢）..."
until curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/ 2>/dev/null | grep -q 200; do sleep 2; done
echo "[install] ✓ http://localhost:4000 已就绪"
echo "[install] 重启命令: launchctl kickstart -k gui/$UID_/$LABEL"
