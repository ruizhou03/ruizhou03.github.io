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

REPO="$(cd "$(dirname "$0")/.." && pwd)"
PROMPT_FILE="$REPO/scripts/flight_watch.prompt.md"
SCRAPE_PY="$REPO/scripts/flight_watch_scrape.py"
NOTIFY_PY="$REPO/scripts/flight_watch_notify.py"
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

cd "$REPO" || { log "cd to $REPO FAILED"; exit 1; }
# ~/.local/bin —— claude CLI 新版安装位置（native installer 自更新后落点）
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
log "starting flight watch (slot=$SLOT)"

command -v claude >/dev/null 2>&1 || { log "claude CLI not found, abort"; notify "claude CLI 找不到" "Basso"; exit 1; }
[ -x "$VENV_PY" ] || { log "venv python 不存在：$VENV_PY，abort"; notify "Playwright venv 缺失" "Basso"; exit 1; }
[ -f "$CONFIG" ] || { log "配置缺失：$CONFIG，abort"; notify "配置文件缺失" "Basso"; exit 1; }

# ── 2. 抓取（Trip.com 全球直连，本步不挂代理）──
log "抓取 Trip.com 中（航线×日期约 60 组，约 15–30 分钟，期间无输出属正常）..."
rm -f "$RESULTS_JSON"
if HTTP_PROXY= HTTPS_PROXY= ALL_PROXY= "$VENV_PY" "$SCRAPE_PY" run >> "$LOG" 2>&1; then
    log "抓取完成"
else
    log "抓取脚本异常退出（exit=$?），继续——可能有部分结果"
fi
if [ ! -f "$RESULTS_JSON" ]; then
    log "无 $RESULTS_JSON，抓取彻底失败，跳过本时段"
    notify "抓取失败，没拿到任何数据，看日志" "Basso"
    log "==== failed ===="; exit 1
fi
OKCOUNT="$("$VENV_PY" -c "import json;print(json.load(open('$RESULTS_JSON')).get('ok_count','?'))" 2>/dev/null || echo '?')"
log "抓取结果：$OKCOUNT 个搜索拿到合规航班"

# ── 3. 网络自适应（claude / SMTP 用）──
PROXY_HOST="127.0.0.1"; PROXY_PORT="7890"
CLASH_APPS=("ClashX" "Clash Party")
probe_proxy_up() { /usr/bin/nc -z -G 2 "$PROXY_HOST" "$PROXY_PORT" 2>/dev/null; }
probe_direct_api() {
    HTTP_PROXY= HTTPS_PROXY= ALL_PROXY= NO_PROXY= \
        /usr/bin/curl --silent --head --max-time 6 --output /dev/null \
        --noproxy '*' https://api.anthropic.com 2>/dev/null
}
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
if probe_proxy_up; then
    set_proxy_env; NET_MODE="proxy"
    log "本机 $PROXY_HOST:$PROXY_PORT 在听，套代理（推测在国内、Clash 已开）"
elif probe_direct_api; then
    unset_proxy_env; NET_MODE="direct"
    log "直连 Anthropic 通 → 走直连（推测在美国）"
else
    log "直连不通且代理端口没人听 → 尝试自动启动 Clash..."
    LAUNCHED=""
    for app in "${CLASH_APPS[@]}"; do
        if [ -d "/Applications/$app.app" ] || [ -d "$HOME/Applications/$app.app" ]; then
            /usr/bin/open -ga "$app" 2>>"$LOG" || true
            for i in $(seq 1 15); do
                sleep 1
                if probe_proxy_up; then LAUNCHED="$app"; break 2; fi
            done
        fi
    done
    if [ -n "$LAUNCHED" ]; then
        set_proxy_env; NET_MODE="proxy(auto-started: $LAUNCHED)"
        log "已自动起 $LAUNCHED 并套代理"
    else
        log "代理拉起失败，claude 判断这步可能跑不通，仍尝试一次"
        NET_MODE="none"
    fi
fi
log "网络模式：$NET_MODE"

# ── 4. claude 判断（读 results，写 verdict/report，维护 history/state）──
rm -f "$VERDICT_JSON" "$REPORT_MD"
PROMPT="$(cat "$PROMPT_FILE")"
log "claude 判断中（约 1–3 分钟）..."
if claude --print \
          --model claude-sonnet-4-6 \
          --dangerously-skip-permissions \
          --append-system-prompt "你被 LaunchAgent 无人值守调用，不要等待输入，所有工具用全权限直接执行。只读写本地文件，不联网。" \
          "$PROMPT" >> "$LOG" 2>&1; then
    log "claude 判断 OK"
else
    EXIT=$?
    log "claude 判断 FAILED (exit=$EXIT)，跳过本时段"
    notify "claude 判断失败，看日志" "Basso"
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
