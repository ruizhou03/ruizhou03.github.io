#!/bin/bash
# 邮件 summary（本机版，由 LaunchAgent 调用）。
# 触发点：StartCalendarInterval 每天 09:00 + 21:00 + RunAtLoad（登录/开机时补跑）。
# 自检规则：
#   1. 按当前小时判定时段：09–13 → morning，21–23 → evening，其余 → 不在窗口、跳过
#   2. 该时段今天已成功跑过 → 跳过
#   3. 否则跑：用 claude 跑 scripts/email_summary.prompt.md，
#      让它读 Gmail、生成 summary、更新 EMAIL_SUMMARY.md、commit、push
#
# 为什么改成本机跑：远程 Anthropic routine 无法用 Gmail MCP connector
# （平台限制，见 GitHub issue #45306）。本机 claude 会话能正常用 connector。
# 附带好处：本机时钟跟着主人走，飞美东后 09:00/21:00 自动是当地时间。
#
# 日志：~/Library/Logs/zirconeey-email-summary.log
# 时段跑过标记：~/Library/Application Support/zirconeey-email-summary/lastrun_{morning,evening}

set -uo pipefail

REPO="/Users/zhourui/Desktop/zirconeey.github.io"
PROMPT_FILE="$REPO/scripts/email_summary.prompt.md"
LOG="$HOME/Library/Logs/zirconeey-email-summary.log"
STATE_DIR="$HOME/Library/Application Support/zirconeey-email-summary"

mkdir -p "$(dirname "$LOG")" "$STATE_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

log "==== triggered ===="

TODAY="$(date '+%Y-%m-%d')"
HOUR="$(date '+%H')"
HOUR="${HOUR#0}"          # 去前导 0，防 bash 当八进制
HOUR="${HOUR:-0}"

# 规则 1：判定时段
if   [ "$HOUR" -ge 9 ]  && [ "$HOUR" -lt 14 ]; then SLOT="morning"
elif [ "$HOUR" -ge 21 ];                       then SLOT="evening"
else
    log "current hour=$HOUR not in any run window (09–13 / 21–23), skipping"
    log "==== skipped ===="
    exit 0
fi
LASTRUN_FILE="$STATE_DIR/lastrun_$SLOT"

# 规则 2：该时段今天已跑过 → 跳过
if [ -f "$LASTRUN_FILE" ] && [ "$(cat "$LASTRUN_FILE" 2>/dev/null || echo '')" = "$TODAY" ]; then
    log "$SLOT slot already ran successfully today ($TODAY), skipping"
    log "==== skipped ===="
    exit 0
fi

# 规则 3：开跑
cd "$REPO" || { log "cd to $REPO FAILED"; exit 1; }
log "starting email summary (slot=$SLOT, cwd=$REPO, model=claude-sonnet-4-6)"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

if ! command -v claude >/dev/null 2>&1; then
    log "claude CLI not found in PATH, abort"
    exit 1
fi

# ── 网络环境自适应（跨太平洋鲁棒）──
#   国内 + Clash 已开 → 套代理
#   国内 + Clash 没开 → 自动拉起再套代理
#   美国 → 直连
# 给不出可用网络 → 优雅跳过（不写 lastrun、下次再试）。
PROXY_HOST="127.0.0.1"
PROXY_PORT="7890"
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
    export NO_PROXY="localhost,127.0.0.1,*.local,.github.com"
}
unset_proxy_env() { unset HTTP_PROXY HTTPS_PROXY ALL_PROXY NO_PROXY; }

NET_MODE=""
if probe_proxy_up; then
    set_proxy_env; NET_MODE="proxy"
    log "本机 $PROXY_HOST:$PROXY_PORT 在听，套代理（推测在国内、Clash 已开）"
else
    if probe_direct_api; then
        unset_proxy_env; NET_MODE="direct"
        log "直连 Anthropic 通 → 走直连（推测在美国 / 不需代理）"
    else
        log "直连不通且 7890 没人听 → 推测在国内但 Clash 未开，尝试自动启动..."
        LAUNCHED=""
        for app in "${CLASH_APPS[@]}"; do
            if [ -d "/Applications/$app.app" ] || [ -d "$HOME/Applications/$app.app" ]; then
                log "  尝试 open -ga '$app'"
                /usr/bin/open -ga "$app" 2>>"$LOG" || true
                for i in $(seq 1 15); do
                    sleep 1
                    if probe_proxy_up; then LAUNCHED="$app"; break 2; fi
                done
                log "  $app 启动后 15s $PROXY_PORT 仍未起，换下一个"
            else
                log "  $app 未安装，跳过"
            fi
        done
        if [ -n "$LAUNCHED" ]; then
            set_proxy_env; NET_MODE="proxy(auto-started: $LAUNCHED)"
            log "已自动起 $LAUNCHED 并套代理"
        else
            log "已知代理 App 均无法拉起 $PROXY_PORT，跳过本时段"
            /usr/bin/osascript -e 'display notification "本机代理未开、直连又不通，自动拉起 Clash 也失败。请手动开代理后再触发。" with title "锆铌·邮件 summary·已跳过" sound name "Tink"' >/dev/null 2>&1 || true
            log "==== skipped ===="
            exit 0
        fi
    fi
fi

# 二次校验：当前 NET_MODE 下真能跑通 Anthropic API
if /usr/bin/curl --silent --head --max-time 8 --output /dev/null https://api.anthropic.com 2>/dev/null; then
    log "api.anthropic.com via $NET_MODE 可达，进入 summary 阶段"
else
    log "api.anthropic.com via $NET_MODE 跑不通，跳过本时段"
    if [[ "$NET_MODE" == proxy* ]]; then
        MSG="代理在听但跑不通 Anthropic API——检查 Clash 订阅 / 节点是否过期"
    else
        MSG="直连不通 Anthropic API——若你在国内，请打开 Clash 后再触发"
    fi
    /usr/bin/osascript -e "display notification \"$MSG\" with title \"锆铌·邮件 summary·已跳过\" sound name \"Tink\"" >/dev/null 2>&1 || true
    log "==== skipped ===="
    exit 0
fi

# 用 claude CLI 跑 summary prompt
#   --print：非交互、跑完即退
#   --model：claude-sonnet-4-6（digest 类任务，每天两次，sonnet 够用且省）
#   --dangerously-skip-permissions：本机无人值守，且 Gmail MCP 工具不能弹批准框
PROMPT="$(cat "$PROMPT_FILE")"
if claude --print \
          --model claude-sonnet-4-6 \
          --dangerously-skip-permissions \
          --append-system-prompt "你正在被 LaunchAgent 无人值守地调用，不要等待任何输入，所有工具（含 Gmail MCP）用全权限直接执行。" \
          "$PROMPT" >> "$LOG" 2>&1; then
    log "email summary OK (slot=$SLOT)"
    echo "$TODAY" > "$LASTRUN_FILE"
    /usr/bin/osascript -e "display notification \"$SLOT 时段邮件 summary 已完成，详情见 GitHub Issue 邮件\" with title \"锆铌·邮件 summary\" sound name \"Glass\"" >/dev/null 2>&1 || true
    log "==== done ===="
    exit 0
else
    EXIT=$?
    log "email summary FAILED (claude exit=$EXIT, slot=$SLOT)"
    /usr/bin/osascript -e 'display notification "本时段邮件 summary 未跑成功，看 ~/Library/Logs/zirconeey-email-summary.log" with title "锆铌·邮件 summary" sound name "Basso"' >/dev/null 2>&1 || true
    exit "$EXIT"
fi
