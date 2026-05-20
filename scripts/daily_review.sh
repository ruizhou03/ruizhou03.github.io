#!/bin/bash
# 每日博客建设性巡检（本机版，由 LaunchAgent 调用）。
# 触发点：StartCalendarInterval 每天 08:00 + RunAtLoad（登录/开机时）。
# 自检三条规则：
#   1. 今天已成功跑过 → 跳过
#   2. 现在还不到 08:00 → 跳过（等定时器到点）
#   3. 否则跑：用 Claude Opus 4.7 跑 scripts/daily_review.prompt.md，
#      让它完成审查 + DAILY_REVIEW.md 更新 + commit + push
#
# 日志：~/Library/Logs/zirconeey-daily-review.log
# 上次成功跑过的日期标记：~/Library/Application Support/zirconeey-daily-review/lastrun

set -uo pipefail

REPO="/Users/zhourui/Desktop/zirconeey.github.io"
PROMPT_FILE="$REPO/scripts/daily_review.prompt.md"
LOG="$HOME/Library/Logs/zirconeey-daily-review.log"
STATE_DIR="$HOME/Library/Application Support/zirconeey-daily-review"
LASTRUN_FILE="$STATE_DIR/lastrun"

mkdir -p "$(dirname "$LOG")" "$STATE_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

log "==== triggered ===="

TODAY="$(date '+%Y-%m-%d')"
HOUR="$(date '+%H')"
# 去掉前导 0 防止 bash 把 "08" 当八进制
HOUR="${HOUR#0}"
HOUR="${HOUR:-0}"

# 规则 1：今天已成功跑过 → 跳过
if [ -f "$LASTRUN_FILE" ]; then
    LAST_DAY="$(cat "$LASTRUN_FILE" 2>/dev/null || echo '')"
    if [ "$LAST_DAY" = "$TODAY" ]; then
        log "already ran successfully today ($TODAY), skipping"
        exit 0
    fi
fi

# 规则 2：现在还不到 08:00 → 跳过，等定时器
if [ "$HOUR" -lt 8 ]; then
    log "current hour=$HOUR < 8, deferring to 08:00 scheduled run"
    exit 0
fi

# 规则 3：开跑
cd "$REPO" || { log "cd to $REPO FAILED"; exit 1; }
log "starting audit (cwd=$REPO, model=claude-opus-4-7)"

# Homebrew 路径（claude / bundle 等都在这里）
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

if ! command -v claude >/dev/null 2>&1; then
    log "claude CLI not found in PATH, abort"
    exit 1
fi

# ── 网络环境自适应：跟着主人位置走 ──
# 国内（Clash 跑在 127.0.0.1:7890）→ 套代理；美国（不挂代理）→ 直连。
# 探 7890 端口是否在听，决定是否设代理环境变量。
PROXY_HOST="127.0.0.1"
PROXY_PORT="7890"
if /usr/bin/nc -z -G 2 "$PROXY_HOST" "$PROXY_PORT" 2>/dev/null; then
    export HTTP_PROXY="http://$PROXY_HOST:$PROXY_PORT"
    export HTTPS_PROXY="http://$PROXY_HOST:$PROXY_PORT"
    export ALL_PROXY="http://$PROXY_HOST:$PROXY_PORT"
    export NO_PROXY="localhost,127.0.0.1,*.local,.github.com"
    NET_MODE="proxy"
    log "detected local proxy on $PROXY_HOST:$PROXY_PORT → using it（推测在国内）"
else
    unset HTTP_PROXY HTTPS_PROXY ALL_PROXY NO_PROXY
    NET_MODE="direct"
    log "no local proxy → going direct（推测在美国 / 不需代理）"
fi

# ── 真探一下 Anthropic API 当前网络通不通 ──
# 不通就优雅跳过当天，发个通知，不进 claude（省 4 分钟超时 + 0 token 消耗）。
if /usr/bin/curl --silent --head --max-time 8 --output /dev/null https://api.anthropic.com 2>/dev/null; then
    log "api.anthropic.com reachable via $NET_MODE，开始审查"
else
    log "api.anthropic.com UNREACHABLE via $NET_MODE，今天跳过（无 token 消耗）"
    if [ "$NET_MODE" = "proxy" ]; then
        MSG="今天连不上 Anthropic API：本机检测到 Clash 在 7890，但跑不通——检查代理订阅 / 节点是否过期"
    else
        MSG="今天连不上 Anthropic API：本机没起代理，若你正好在国内，请打开 Clash 再触发"
    fi
    /usr/bin/osascript -e "display notification \"$MSG\" with title \"锆铌·每日巡检·已跳过\" sound name \"Tink\"" >/dev/null 2>&1 || true
    log "==== skipped ===="
    exit 0   # 优雅退出，不算失败、不消费 lastrun，明天/下次照常再试
fi

# 用 claude CLI 跑审查 prompt
# --print：非交互、跑完即退
# --model：固定 Opus 4.7
# --dangerously-skip-permissions：本机无人值守，不能弹权限框
# stdout/stderr 全进日志
PROMPT="$(cat "$PROMPT_FILE")"
if claude --print \
          --model claude-opus-4-7 \
          --dangerously-skip-permissions \
          --append-system-prompt "你正在被 LaunchAgent 无人值守地调用，不要等待任何输入，所有工具用全权限直接执行。" \
          "$PROMPT" >> "$LOG" 2>&1; then
    log "audit OK"
    echo "$TODAY" > "$LASTRUN_FILE"
    # 给一个 macOS 桌面通知作为兜底（GitHub Action 那边也会开 Issue + 发邮件）
    /usr/bin/osascript -e 'display notification "今日博客巡检已完成，详情见 DAILY_REVIEW.md 或 GitHub Issue" with title "锆铌·每日巡检" sound name "Glass"' >/dev/null 2>&1 || true
    log "==== done ===="
    exit 0
else
    EXIT=$?
    log "audit FAILED (claude exit=$EXIT)"
    /usr/bin/osascript -e 'display notification "今日博客巡检未跑成功，看 ~/Library/Logs/zirconeey-daily-review.log" with title "锆铌·每日巡检" sound name "Basso"' >/dev/null 2>&1 || true
    exit "$EXIT"
fi
