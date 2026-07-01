#!/usr/bin/env bash
# 机票监控 · 一键安装器（拟托管到 https://ruizhou03.com/flight/get）。
#   curl -fsSL https://ruizhou03.com/flight/get | bash -s -- <盯票码>
# 装到 ~/.flightwatch/：下载运行器 → 建 venv+Playwright → 落配置 → 装 flightwatch 命令
#   → （mac）装定时 LaunchAgent → 跑第一轮。mac 优先；不复用任何私人路径。
#
# 测试/进阶开关（环境变量）：
#   FLIGHTWATCH_HOME    安装目录（默认 ~/.flightwatch）
#   FLIGHTWATCH_SRC     runner 源（本地目录=cp / URL=curl；默认 raw.githubusercontent）
#   FLIGHTWATCH_VENV    复用现成 venv（跳过建 venv + playwright install）
#   FLIGHTWATCH_BIN     flightwatch 命令落点（默认 ~/.local/bin）
#   FLIGHTWATCH_MODE    simple|full（非交互）
#   FLIGHTWATCH_MODEL / _API_KEY / _EMAIL_USER / _EMAIL_PASSWORD  完整模式凭证（非交互）
#   FLIGHTWATCH_SKIP_SCHEDULE=1  不装定时    FLIGHTWATCH_SKIP_FIRSTRUN=1  不跑首轮
set -uo pipefail

FW_HOME="${FLIGHTWATCH_HOME:-$HOME/.flightwatch}"
APP="$FW_HOME/app"
VENV_DIR="$FW_HOME/venv"
BIN="${FLIGHTWATCH_BIN:-$HOME/.local/bin}"
SRC="${FLIGHTWATCH_SRC:-https://raw.githubusercontent.com/ruizhou03/ruizhou03.github.io/main/_flight-staging/runner}"
FILES="__init__.py config.py scrape.py judge_api.py judge_simple.py notify.py platform.py flightwatch.py"
CODE="${1:-${FLIGHTWATCH_CONFIG:-}}"   # 盯票码 fw_... 或 flightwatch.json 路径

say(){ printf '  %s\n' "$*"; }

install_launchd(){  # $1=home $2=wrapper $3=python $4=app
  local plist="$HOME/Library/LaunchAgents/com.flightwatch.plist"
  local times
  times=$(PYTHONPATH="$4" FLIGHTWATCH_HOME="$1" "$3" - "$1/flightwatch.json" <<'PY'
import sys, json
from runner import config
c = config.load(sys.argv[1]); s = c.get("schedule", {}) or {}
if s.get("mode") == "interval":
    sh = int((s.get("start") or "08:00").split(":")[0]); eh = int((s.get("end") or "22:00").split(":")[0])
    step = int(s.get("every_hours") or 4)
    ts = [f"{h:02d}:00" for h in range(sh, eh + 1, max(step, 1))]
else:
    ts = s.get("times") or ["09:00", "21:00"]
print(" ".join(ts))
PY
)
  local cals=""
  for t in $times; do
    local h="${t%%:*}" m="${t##*:}"
    cals+="<dict><key>Hour</key><integer>$((10#$h))</integer><key>Minute</key><integer>$((10#$m))</integer></dict>"
  done
  cat > "$plist" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.flightwatch</string>
  <key>ProgramArguments</key><array><string>$2</string><string>run</string></array>
  <key>StartCalendarInterval</key><array>$cals</array>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>$1/launchd.log</string>
  <key>StandardErrorPath</key><string>$1/launchd.log</string>
</dict></plist>
PL
  launchctl bootout "gui/$(id -u)" "$plist" 2>/dev/null
  launchctl bootstrap "gui/$(id -u)" "$plist" 2>/dev/null && say "定时已设：$times"
}

echo "机票监控 · 安装 → $FW_HOME"
command -v python3 >/dev/null 2>&1 || { echo "需要 Python 3（python.org 下载）"; exit 1; }
mkdir -p "$APP/runner" "$FW_HOME" "$BIN"

# 1) 下载运行器
say "下载运行器…"
for f in $FILES; do
  if [ -d "$SRC" ]; then cp "$SRC/$f" "$APP/runner/$f"
  else curl -fsSL "$SRC/$f" -o "$APP/runner/$f" || { echo "下载 $f 失败"; exit 1; }; fi
done

# 2) venv + 依赖
if [ -n "${FLIGHTWATCH_VENV:-}" ]; then
  PY="$FLIGHTWATCH_VENV/bin/python"; say "复用现成 venv：$FLIGHTWATCH_VENV"
else
  say "建 venv + 装依赖（Playwright 浏览器内核约 100MB，约 1–3 分钟）…"
  python3 -m venv "$VENV_DIR"; PY="$VENV_DIR/bin/python"
  "$PY" -m pip install -q --upgrade pip >/dev/null 2>&1
  "$PY" -m pip install -q playwright markdown || { echo "装依赖失败"; exit 1; }
  "$PY" -m playwright install chromium || { echo "装 chromium 失败"; exit 1; }
fi

# 3) 配置：解码盯票码 / 读 json → flightwatch.json（原始形态，config.load 再规范化）
if [ -n "$CODE" ]; then
  say "写入盯票配置…"
  PYTHONPATH="$APP" "$PY" -c "import sys,json; from runner import config; print(json.dumps(config.load_raw(sys.argv[1]),ensure_ascii=False))" "$CODE" \
    > "$FW_HOME/flightwatch.json" || { echo "配置解析失败（盯票码/文件无效）"; exit 1; }
else
  say "⚠️ 没给盯票码——稍后把 flightwatch.json 放到 $FW_HOME/ 再跑 flightwatch run"
fi

# 4) 模式 + 凭证
MODE="${FLIGHTWATCH_MODE:-}"
[ -z "$MODE" ] && { read -rp "模式 [simple 零密钥 / full AI+邮件]（默认 simple）: " MODE; MODE="${MODE:-simple}"; }
printf '{"mode":"%s"}\n' "$MODE" > "$FW_HOME/settings.json"
CRED="$FW_HOME/credentials"; : > "$CRED"; chmod 600 "$CRED"
if [ "$MODE" = "full" ]; then
  MODEL="${FLIGHTWATCH_MODEL:-}"; APIKEY="${FLIGHTWATCH_API_KEY:-}"
  EU="${FLIGHTWATCH_EMAIL_USER:-}"; EP="${FLIGHTWATCH_EMAIL_PASSWORD:-}"
  [ -z "$MODEL" ] && read -rp "AI 模型（provider:model，如 anthropic:claude-opus-4-8）: " MODEL
  [ -z "$APIKEY" ] && { read -rsp "该厂商 API key: " APIKEY; echo; }
  [ -z "$EU" ] && read -rp "收件邮箱（留空=不发邮件）: " EU
  [ -n "$EU" ] && [ -z "$EP" ] && { read -rsp "邮箱应用密码: " EP; echo; }
  { echo "FLIGHTWATCH_MODEL=$MODEL"; echo "FLIGHTWATCH_API_KEY=$APIKEY";
    echo "EMAIL_USER=$EU"; echo "EMAIL_PASSWORD=$EP"; } >> "$CRED"
fi

# 5) flightwatch 命令包装
cat > "$BIN/flightwatch" <<WRAP
#!/usr/bin/env bash
export FLIGHTWATCH_HOME="$FW_HOME"
export PYTHONPATH="$APP\${PYTHONPATH:+:\$PYTHONPATH}"
if [ -f "$FW_HOME/credentials" ]; then
  while IFS='=' read -r k v; do
    case "\$k" in FLIGHTWATCH_MODEL|FLIGHTWATCH_API_KEY|FLIGHTWATCH_BASE_URL|EMAIL_USER|EMAIL_PASSWORD) export "\$k=\$v";; esac
  done < "$FW_HOME/credentials"
fi
exec "$PY" -m runner.flightwatch "\$@"
WRAP
chmod +x "$BIN/flightwatch"
say "已装命令：$BIN/flightwatch"
case ":$PATH:" in *":$BIN:"*) : ;; *) say "提示：$BIN 不在 PATH 里，用全路径 $BIN/flightwatch 或把它加进 PATH";; esac

# 6) 定时（mac LaunchAgent）
if [ "${FLIGHTWATCH_SKIP_SCHEDULE:-}" != "1" ] && [ "$(uname)" = "Darwin" ] && [ -f "$FW_HOME/flightwatch.json" ]; then
  say "安装定时任务…"; install_launchd "$FW_HOME" "$BIN/flightwatch" "$PY" "$APP"
fi

# 7) 首轮
if [ "${FLIGHTWATCH_SKIP_FIRSTRUN:-}" != "1" ] && [ -f "$FW_HOME/flightwatch.json" ]; then
  say "跑第一轮（首轮抓取约几分钟，别关窗口）…"
  "$BIN/flightwatch" run --force || echo "  首轮有问题，看 $FW_HOME/run.log"
fi
echo "✅ 装好了。flightwatch status 看状态 · flightwatch panel 看面板 · flightwatch pause 暂停 · flightwatch uninstall 卸载"
