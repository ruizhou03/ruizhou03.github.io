#!/bin/bash
# 邮件 summary（本机版，由 LaunchAgent 调用）。
# 触发点：StartCalendarInterval 每天 09:00 + 21:00 + RunAtLoad（登录/开机补跑）。
#
# 流程：
#   1. 按当前小时判定时段：09–13 → morning，21–23 → evening，其余 → 跳过
#   2. 该时段今天已成功跑过 → 跳过
#   3. 网络自适应（国内套 Clash 代理 / 美国直连）
#   4. email_summary_imap.py fetch   —— IMAP 拉收件箱 → /tmp/email_summary_inbox.json
#   5. claude 跑 email_summary.prompt.md —— 读 inbox.json，写 EMAIL_SUMMARY.md /
#      state / /tmp/email_summary_drafts.json（claude 只读写本地文件，不碰网络）
#   6. email_summary_imap.py draft   —— 把草稿 APPEND 进 Gmail 草稿箱
#   7. git commit + push（带 rebase 重试）→ GitHub Action 转 Issue 邮件
#
# 为什么这套架构：claude.ai 的 Gmail web connector 只能在交互式会话用，
# 远程 routine 和本地 headless claude 都加载不了它（见 GitHub issue #45306）。
# 所以改由 Python 用 IMAP + 应用专用密码做 Gmail I/O，claude 只当“大脑”。
#
# 凭证：~/.config/zirconeey-email-summary/imap_credentials（chmod 600）
# 日志：~/Library/Logs/zirconeey-email-summary.log
# 时段标记：~/Library/Application Support/zirconeey-email-summary/lastrun_{morning,evening}

set -uo pipefail

REPO="/Users/zhourui/Desktop/zirconeey.github.io"
PROMPT_FILE="$REPO/scripts/email_summary.prompt.md"
IMAP_PY="$REPO/scripts/email_summary_imap.py"
INBOX_JSON="/tmp/email_summary_inbox.json"
DRAFTS_JSON="/tmp/email_summary_drafts.json"
LOG="$HOME/Library/Logs/zirconeey-email-summary.log"
STATE_DIR="$HOME/Library/Application Support/zirconeey-email-summary"

mkdir -p "$(dirname "$LOG")" "$STATE_DIR"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }
notify() {  # $1=正文 $2=声音
    /usr/bin/osascript -e "display notification \"$1\" with title \"锆铌·邮件 summary\" sound name \"${2:-Glass}\"" >/dev/null 2>&1 || true
}

log "==== triggered ===="

TODAY="$(date '+%Y-%m-%d')"
HOUR="$(date '+%H')"; HOUR="${HOUR#0}"; HOUR="${HOUR:-0}"

# ── 1. 判定时段 ──
if   [ "$HOUR" -ge 9 ]  && [ "$HOUR" -lt 14 ]; then SLOT="morning"
elif [ "$HOUR" -ge 21 ];                       then SLOT="evening"
else
    log "current hour=$HOUR not in any run window (09–13 / 21–23), skipping"
    log "==== skipped ===="; exit 0
fi
LASTRUN_FILE="$STATE_DIR/lastrun_$SLOT"

# ── 2. 该时段今天已跑过 → 跳过 ──
if [ -f "$LASTRUN_FILE" ] && [ "$(cat "$LASTRUN_FILE" 2>/dev/null || echo '')" = "$TODAY" ]; then
    log "$SLOT slot already ran today ($TODAY), skipping"
    log "==== skipped ===="; exit 0
fi

cd "$REPO" || { log "cd to $REPO FAILED"; exit 1; }
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
log "starting email summary (slot=$SLOT, model=claude-sonnet-4-6)"

command -v claude  >/dev/null 2>&1 || { log "claude CLI not found, abort"; exit 1; }
command -v python3 >/dev/null 2>&1 || { log "python3 not found, abort"; exit 1; }

# ── 3. 网络自适应（跨太平洋鲁棒）──
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
    export NO_PROXY="localhost,127.0.0.1,*.local,.github.com"
    # IMAP 脚本经此代理对 imap.gmail.com 做 HTTP CONNECT 隧道
    export IMAP_PROXY_HOST="$PROXY_HOST"
    export IMAP_PROXY_PORT="$PROXY_PORT"
}
unset_proxy_env() {
    unset HTTP_PROXY HTTPS_PROXY ALL_PROXY NO_PROXY IMAP_PROXY_HOST IMAP_PROXY_PORT
}

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
            log "代理 App 均无法拉起，跳过本时段"
            notify "代理未开、直连又不通，自动拉起 Clash 也失败。请手动开代理后再触发。" "Tink"
            log "==== skipped ===="; exit 0
        fi
    fi
fi

# 二次校验 Anthropic API
if ! /usr/bin/curl --silent --head --max-time 8 --output /dev/null https://api.anthropic.com 2>/dev/null; then
    log "api.anthropic.com via $NET_MODE 跑不通，跳过本时段"
    notify "跑不通 Anthropic API（$NET_MODE）——检查网络 / Clash 订阅" "Tink"
    log "==== skipped ===="; exit 0
fi
log "网络就绪（$NET_MODE）"

# ── 4. IMAP 拉收件箱 ──
# SINCE = state 里的 last_summary_at_utc；为空则回退到 12 小时前
SINCE="$(python3 -c "import json,sys
try:
    d=json.load(open('_data/email_summary_state.json'))
    print(d.get('last_summary_at_utc') or '')
except Exception:
    print('')" 2>/dev/null)"
if [ -z "$SINCE" ]; then
    SINCE="$(date -u -v-12H +%Y-%m-%dT%H:%M:%SZ)"
    log "state 无 last_summary_at_utc，SINCE 回退到 12h 前：$SINCE"
else
    log "SINCE = $SINCE"
fi

log "IMAP fetch..."
if ! python3 "$IMAP_PY" fetch "$SINCE" "$INBOX_JSON" >> "$LOG" 2>&1; then
    log "IMAP fetch FAILED，跳过本时段（不写 lastrun，下次重试）"
    notify "IMAP 拉信失败，看 ~/Library/Logs/zirconeey-email-summary.log" "Basso"
    log "==== failed ===="; exit 1
fi
COUNT="$(python3 -c "import json; print(json.load(open('$INBOX_JSON')).get('message_count',0))" 2>/dev/null || echo '?')"
log "IMAP fetch OK，收件箱新邮件 $COUNT 封"

# ── 5. claude 生成 summary（只读写本地文件）──
rm -f "$DRAFTS_JSON"
PROMPT="$(cat "$PROMPT_FILE")"
if claude --print \
          --model claude-sonnet-4-6 \
          --dangerously-skip-permissions \
          --append-system-prompt "你被 LaunchAgent 无人值守调用，不要等待输入，所有工具用全权限直接执行。只读写本地文件，不联网。" \
          "$PROMPT" >> "$LOG" 2>&1; then
    log "claude summary OK"
else
    EXIT=$?
    log "claude summary FAILED (exit=$EXIT)，跳过本时段"
    notify "claude 生成 summary 失败，看日志" "Basso"
    log "==== failed ===="; exit "$EXIT"
fi

# ── 6. 把草稿 APPEND 进 Gmail 草稿箱（失败不致命）──
if [ -f "$DRAFTS_JSON" ]; then
    log "IMAP draft append..."
    if python3 "$IMAP_PY" draft "$DRAFTS_JSON" >> "$LOG" 2>&1; then
        log "IMAP draft OK"
    else
        log "IMAP draft FAILED（不致命，summary 仍照常提交）"
    fi
else
    log "无 $DRAFTS_JSON，跳过草稿步骤"
fi

# ── 7. git commit + push（带 rebase 重试）──
git add EMAIL_SUMMARY.md _data/email_summary_state.json 2>>"$LOG"
if git diff --cached --quiet; then
    log "无改动可提交（claude 可能没改文件），跳过 push"
    notify "本时段 summary 跑完但无文件改动，看日志确认" "Tink"
    echo "$TODAY" > "$LASTRUN_FILE"
    log "==== done (nothing to commit) ===="; exit 0
fi
git commit -m "ops(email-summary): $TODAY $SLOT 自动邮件 summary" >> "$LOG" 2>&1
PUSHED=0
for attempt in 1 2 3 4 5; do
    if git pull --rebase origin main >> "$LOG" 2>&1 && git push origin main >> "$LOG" 2>&1; then
        PUSHED=1; break
    fi
    log "push 第 $attempt 次失败，5s 后重试"; sleep 5
done

if [ "$PUSHED" = 1 ]; then
    log "push OK (slot=$SLOT)"
    echo "$TODAY" > "$LASTRUN_FILE"
    notify "$SLOT 时段邮件 summary 已完成，详情见 GitHub Issue 邮件" "Glass"
    log "==== done ===="; exit 0
else
    log "push FAILED after 5 tries（commit 已在本地，下次会一并推上去）"
    echo "$TODAY" > "$LASTRUN_FILE"
    notify "summary 已生成但 push 失败，下次自动补推" "Tink"
    log "==== done (push pending) ===="; exit 0
fi
