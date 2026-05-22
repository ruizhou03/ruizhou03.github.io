#!/bin/bash
# 机票监控（本机版，由 LaunchAgent 调用）。
# 触发点：StartCalendarInterval 每天 10:00 + 22:00 + RunAtLoad（登录/开机补跑）。
#
# 流程：
#   1. 按当前小时判定时段：10–14 → morning，22–24 → evening，其余 → 跳过
#   2. 该时段今天已成功跑过 → 跳过
#   3. 网络自适应（claude / SMTP 在国内需经 Clash 代理；Trip.com 全球直连，抓取层不挂代理）
#   4. flight_watch_scrape.py run   —— Playwright 抓 Trip.com → /tmp/flight_watch_results.json
#   5. claude 跑 flight_watch.prompt.md —— 读 results，判断便宜票、维护 history/state、
#      写 /tmp/flight_watch_verdict.json + /tmp/flight_watch_report.md（只读写本地文件）
#   6. flight_watch_notify.py send  —— 按裁决三渠道投递（Bark / Mac 通知 / SMTP 私密邮件）
#
# 全程不碰 git、不进任何仓库 —— 出行计划是私密信息，只走本机 + 私密邮件。
#
# 配置：~/.config/zirconeey-flight-watch/config.json
# 凭证：~/.config/zirconeey-flight-watch/credentials（Bark）
#       ~/.config/zirconeey-email-summary/imap_credentials（Gmail SMTP，复用）
# 日志：~/Library/Logs/zirconeey-flight-watch.log
# 时段标记：~/.config/zirconeey-flight-watch/lastrun_{morning,evening}

set -uo pipefail

# 自定位：脚本和它的兄弟文件（scrape.py / notify.py / prompt.md）一起跑。
# 部署位置应在 ~/.config/zirconeey-flight-watch/（本地盘），不要从 iCloud 同步的
# 仓库目录直接跑 —— 否则 Python 会把脚本所在的 iCloud 目录放进 sys.path，
# 运行时 import 在那里 stat/open 文件会被 iCloud 间歇性拖死、进程冻在 0% CPU。
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
PROMPT_FILE="$SELF_DIR/flight_watch.prompt.md"
SCRAPE_PY="$SELF_DIR/flight_watch_scrape.py"
NOTIFY_PY="$SELF_DIR/flight_watch_notify.py"
VENV_PY="$HOME/.config/zirconeey-flight-watch/venv/bin/python"
CONFIG="$HOME/.config/zirconeey-flight-watch/config.json"
RESULTS_JSON="/tmp/flight_watch_results.json"
VERDICT_JSON="/tmp/flight_watch_verdict.json"
REPORT_MD="/tmp/flight_watch_report.md"
LOG="$HOME/Library/Logs/zirconeey-flight-watch.log"
STATE_DIR="$HOME/.config/zirconeey-flight-watch"

mkdir -p "$(dirname "$LOG")" "$STATE_DIR"

# force 模式（手动测试）：bash flight_watch.sh force —— 跳过时段窗口 + lastrun，日志同时打到终端
FORCE=""
[ "${1:-}" = "force" ] && FORCE=1

log() {
    local l="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
    echo "$l" >> "$LOG"
    [ -n "${FORCE:-}" ] && echo "$l"
    return 0
}
notify() {  # $1=正文 $2=声音
    /usr/bin/osascript -e "display notification \"$1\" with title \"锆铌·机票监控\" sound name \"${2:-Glass}\"" >/dev/null 2>&1 || true
}
mark_done() {
    [ -z "${FORCE:-}" ] && echo "$TODAY" > "$LASTRUN_FILE"
    return 0
}

log "==== triggered${FORCE:+ (force)} ===="

TODAY="$(date '+%Y-%m-%d')"
HOUR="$(date '+%H')"; HOUR="${HOUR#0}"; HOUR="${HOUR:-0}"

# ── 1. 判定时段 ──
if [ "$HOUR" -lt 17 ]; then SLOT="morning"; else SLOT="evening"; fi
LASTRUN_FILE="$STATE_DIR/lastrun_$SLOT"

if [ -n "$FORCE" ]; then
    log "force 模式：跳过时段窗口 + lastrun 检查（SLOT=${SLOT}）"
else
    # 非 force：必须在运行窗口内（morning 10–14 / evening 22–24）
    if ! { { [ "$HOUR" -ge 10 ] && [ "$HOUR" -lt 14 ]; } || [ "$HOUR" -ge 22 ]; }; then
        log "current hour=$HOUR not in any run window (10–14 / 22–24), skipping"
        log "==== skipped ===="; exit 0
    fi
    if [ -f "$LASTRUN_FILE" ] && [ "$(cat "$LASTRUN_FILE" 2>/dev/null || echo '')" = "$TODAY" ]; then
        log "$SLOT slot already ran today ($TODAY), skipping"
        log "==== skipped ===="; exit 0
    fi
fi

# 在 /tmp（本地盘）里跑，不在仓库目录里 —— 仓库位于 ~/Desktop（iCloud 同步区），
# 子进程（python/claude/node）启动时的 getcwd() 会被 iCloud 间歇性拖死，把进程冻在 0% CPU。
# 本脚本全程用绝对路径，不依赖 CWD。
cd /tmp || { log "cd /tmp FAILED"; exit 1; }
# ~/.local/bin —— claude CLI 新版安装位置（native installer 自更新后落点）
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
log "starting flight watch (slot=$SLOT)"

command -v claude >/dev/null 2>&1 || { log "claude CLI not found, abort"; notify "claude CLI 找不到" "Basso"; exit 1; }
[ -x "$VENV_PY" ] || { log "venv python 不存在：$VENV_PY，abort"; notify "Playwright venv 缺失" "Basso"; exit 1; }
[ -f "$CONFIG" ] || { log "配置缺失：$CONFIG，abort"; notify "配置文件缺失" "Basso"; exit 1; }

# 全程防休眠：抓取 30 分钟 + claude 判断期间，低 CPU 步骤会让 Mac 空闲休眠、
# 把无人值守的进程冻在 0% CPU。caffeinate -w $$ 在本脚本退出时自动结束。
/usr/bin/caffeinate -dimsu -w $$ &
log "caffeinate 已挂起（防运行期间休眠），PID=$!"

# ── 2. 抓取（Trip.com 全球直连，本步不挂代理）──
# 若已有 3 小时内的 results.json（如上轮抓完但 claude 那步挂了），复用、不重抓——省 ~30 分钟。
REUSE=""
if [ -f "$RESULTS_JSON" ]; then
    AGE=$(( $(date +%s) - $(/usr/bin/stat -f %m "$RESULTS_JSON" 2>/dev/null || echo 0) ))
    if [ "$AGE" -ge 0 ] && [ "$AGE" -lt 10800 ]; then
        REUSE=1
        log "复用 $((AGE/60)) 分钟前的 results.json，跳过抓取"
    fi
fi
if [ -z "$REUSE" ]; then
    log "抓取 Trip.com 中（航线×日期约 60 组，约 15–30 分钟，期间无输出属正常）..."
    rm -f "$RESULTS_JSON"
    if HTTP_PROXY= HTTPS_PROXY= ALL_PROXY= "$VENV_PY" "$SCRAPE_PY" run >> "$LOG" 2>&1; then
        log "抓取完成"
    else
        log "抓取脚本异常退出（exit=$?），继续——可能有部分结果"
    fi
fi
if [ ! -f "$RESULTS_JSON" ]; then
    log "无 $RESULTS_JSON，抓取彻底失败，跳过本时段"
    notify "抓取失败，没拿到任何数据，看日志" "Basso"
    log "==== failed ===="; exit 1
fi
OKCOUNT="$("$VENV_PY" -c "import json;print(json.load(open('$RESULTS_JSON')).get('ok_count','?'))" 2>/dev/null || echo '?')"
log "抓取结果：$OKCOUNT 个搜索拿到合规航班"

# ── 3. 网络自适应（claude / SMTP 用）—— 直连优先，每种模式都做「真的连得上 API」二次验证 ──
# 教训：只看代理端口在不在听不够 —— Clash 开着但节点不通时 claude 会无限期挂起。
PROXY_HOST="127.0.0.1"; PROXY_PORT="7890"
CLASH_APPS=("ClashX" "Clash Party")
API_PROBE="https://api.anthropic.com"

api_reachable() {  # 当前环境（含/不含代理 env）下能否 8s 内摸到 API
    /usr/bin/curl --silent --head --max-time 8 --output /dev/null "$API_PROBE" 2>/dev/null
}
proxy_port_up() { /usr/bin/nc -z -G 2 "$PROXY_HOST" "$PROXY_PORT" 2>/dev/null; }
set_proxy_env() {
    export HTTP_PROXY="http://$PROXY_HOST:$PROXY_PORT"
    export HTTPS_PROXY="http://$PROXY_HOST:$PROXY_PORT"
    export ALL_PROXY="http://$PROXY_HOST:$PROXY_PORT"
    export NO_PROXY="localhost,127.0.0.1,*.local"
    export IMAP_PROXY_HOST="$PROXY_HOST"      # notify.py 经此对 smtp.gmail.com 做 CONNECT 隧道
    export IMAP_PROXY_PORT="$PROXY_PORT"
}
unset_proxy_env() { unset HTTP_PROXY HTTPS_PROXY ALL_PROXY NO_PROXY IMAP_PROXY_HOST IMAP_PROXY_PORT; }

NET_MODE=""
unset_proxy_env
if api_reachable; then
    NET_MODE="direct"
    log "直连 Anthropic API 通 → 走直连"
elif proxy_port_up && set_proxy_env && api_reachable; then
    NET_MODE="proxy"
    log "直连不通、经代理 $PROXY_HOST:$PROXY_PORT 验证通 → 走代理"
else
    unset_proxy_env
    log "直连与现有代理均不通 → 尝试自动启动 Clash..."
    LAUNCHED=""
    for app in "${CLASH_APPS[@]}"; do
        if [ -d "/Applications/$app.app" ] || [ -d "$HOME/Applications/$app.app" ]; then
            /usr/bin/open -ga "$app" 2>>"$LOG" || true
            for i in $(seq 1 15); do
                sleep 1
                if proxy_port_up; then LAUNCHED="$app"; break 2; fi
            done
        fi
    done
    if [ -n "$LAUNCHED" ] && set_proxy_env && api_reachable; then
        NET_MODE="proxy(auto-started: $LAUNCHED)"
        log "已自动起 $LAUNCHED，经代理验证通"
    else
        log "网络不通（直连/代理都连不上 API），跳过本时段——results.json 已留存"
        notify "网络不通，claude 判断没法跑，跳过本时段。检查网络 / Clash 订阅。" "Basso"
        log "==== skipped ===="; exit 0
    fi
fi
log "网络模式：$NET_MODE"

# ── 4. claude 判断（读 results，写 verdict/report，维护 history/state）──
# 用 perl 的 alarm 给 claude 套 15 分钟硬超时（macOS 无 timeout 命令）——再卡死也不会无限挂。
rm -f "$VERDICT_JSON" "$REPORT_MD"
PROMPT="$(cat "$PROMPT_FILE")"
log "claude 判断中（约 1–3 分钟）..."
if perl -e 'alarm shift @ARGV; exec @ARGV' 900 \
        claude --print \
          --model claude-sonnet-4-6 \
          --dangerously-skip-permissions \
          --append-system-prompt "你被 LaunchAgent 无人值守调用，不要等待输入，所有工具用全权限直接执行。只读写本地文件，不联网。" \
          "$PROMPT" >> "$LOG" 2>&1; then
    log "claude 判断 OK"
else
    EXIT=$?
    log "claude 判断 FAILED (exit=$EXIT，137/142 多为超时被杀)，跳过本时段"
    notify "claude 判断失败/超时，看日志" "Basso"
    log "==== failed ===="; exit "$EXIT"
fi

if [ ! -f "$VERDICT_JSON" ]; then
    log "claude 没写出 $VERDICT_JSON，跳过投递"
    notify "判断完成但无裁决文件，看日志" "Tink"
    mark_done
    log "==== done (no verdict) ===="; exit 0
fi

# ── 5. 三渠道投递 ──
log "投递中..."
"$VENV_PY" "$NOTIFY_PY" send >> "$LOG" 2>&1 || log "notify 脚本有渠道失败（不致命，看日志）"

SHOULD="$("$VENV_PY" -c "import json;print(json.load(open('$VERDICT_JSON')).get('should_notify'))" 2>/dev/null || echo '?')"
REASON="$("$VENV_PY" -c "import json;print(json.load(open('$VERDICT_JSON')).get('reason',''))" 2>/dev/null || echo '?')"
mark_done
log "本时段完成（should_notify=$SHOULD, reason=$REASON）"
if [ "$SHOULD" = "True" ]; then
    notify "$SLOT 时段完成：有推送（$REASON），详情见邮件 / Bark" "Glass"
else
    notify "$SLOT 时段完成：今日无可抢便宜票，监控正常" "Glass"
fi
log "==== done ===="; exit 0
