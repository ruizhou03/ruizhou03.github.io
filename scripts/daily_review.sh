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

REPO="/Users/zhourui/Desktop/ruizhou03.github.io"
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

# claude CLI 装在 ~/.local/bin/claude（官方 native 安装器），Homebrew 的 bundle 也要在 PATH 里
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

if ! command -v claude >/dev/null 2>&1; then
    log "claude CLI not found in PATH, abort"
    exit 1
fi

# ── 网络环境自适应（跨太平洋鲁棒）──
# 三种场景一套逻辑：
#   国内 + Clash 已开 → 套代理
#   国内 + Clash 没开（忘了 / 重启没自启 / 关了）→ 自动拉起 Clash 再套代理
#   美国 → 直连，根本不去捅本机不存在的代理
# 给不出代理或代理跑不通 → 优雅跳过（不消耗 token、不写 lastrun、下次再试）。
PROXY_HOST="127.0.0.1"
PROXY_PORT="7890"
# 想自动拉起的代理 App，按优先级排（先 ClashX，再 Clash Party）；只要任一拉起就行
CLASH_APPS=("ClashX" "Clash Party")

probe_proxy_up() { /usr/bin/nc -z -G 2 "$PROXY_HOST" "$PROXY_PORT" 2>/dev/null; }
probe_direct_api() {
    # 强制不走任何代理，直接捅 Anthropic API；通则说明在直连可达的网络环境
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
    # 7890 没人听。先判断是不是在直连可达的网络（美国），是的话什么也不做。
    if probe_direct_api; then
        unset_proxy_env; NET_MODE="direct"
        log "直连 Anthropic 通 → 走直连（推测在美国 / 不需代理）"
    else
        # 直连不通 + 7890 没人听 → 在国内但 Clash 没开。试着自动拉起。
        log "直连不通且 7890 没人听 → 推测在国内但 Clash 未开，尝试自动启动..."
        LAUNCHED=""
        for app in "${CLASH_APPS[@]}"; do
            if [ -d "/Applications/$app.app" ] || [ -d "$HOME/Applications/$app.app" ]; then
                log "  尝试 open -ga '$app'"
                /usr/bin/open -ga "$app" 2>>"$LOG" || true
                # 启动后等 7890 起来，每秒一探，最多 15s
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
            log "已知代理 App 均无法拉起 $PROXY_PORT，跳过当天"
            /usr/bin/osascript -e 'display notification "本机代理未开、直连又不通，尝试自动拉起 Clash 也失败。请手动开代理后再触发。" with title "锆铌·每日巡检·已跳过" sound name "Tink"' >/dev/null 2>&1 || true
            log "==== skipped ===="
            exit 0
        fi
    fi
fi

# ── 二次校验：当前 NET_MODE 下真的能跑通 Anthropic API 吗 ──
# 防代理在听但订阅过期 / 节点死的情况，避免进 claude 跑 4 分钟才发现连不上。
if /usr/bin/curl --silent --head --max-time 8 --output /dev/null https://api.anthropic.com 2>/dev/null; then
    log "api.anthropic.com via $NET_MODE 可达，进入审查阶段"
else
    log "api.anthropic.com via $NET_MODE 跑不通，跳过当天"
    if [[ "$NET_MODE" == proxy* ]]; then
        MSG="代理在听但跑不通 Anthropic API——检查 Clash 订阅 / 节点是否过期"
    else
        MSG="直连不通 Anthropic API——若你正好在国内，请打开 Clash 后再触发"
    fi
    /usr/bin/osascript -e "display notification \"$MSG\" with title \"锆铌·每日巡检·已跳过\" sound name \"Tink\"" >/dev/null 2>&1 || true
    log "==== skipped ===="
    exit 0
fi

# ── 预检：远程 routine 今天是否已经跑过 ──
# 远程 Anthropic routine 也按 08:00 GMT+8 调度跑同一份 prompt 并 push 到 origin/main。
# 本机 LaunchAgent 把自己的触发推到 08:30，给远程 30 分钟头部时间。
# 若 origin/main 上今天已经有 DAILY_REVIEW.md 的 commit → 说明远程已跑完，本机让位。
log "git fetch origin main 检查今天远程 routine 是否已 push..."
if git fetch origin main --quiet 2>>"$LOG"; then
    SINCE_MIDNIGHT="$(date '+%Y-%m-%d 00:00:00')"
    REMOTE_TODAY_COMMIT="$(git log origin/main --since="$SINCE_MIDNIGHT" --pretty=format:'%h %s' -- DAILY_REVIEW.md 2>/dev/null | head -1)"
    if [ -n "$REMOTE_TODAY_COMMIT" ]; then
        log "origin/main 今天已有 DAILY_REVIEW.md 提交：$REMOTE_TODAY_COMMIT → 远程 routine 已跑，本机让位"
        echo "$TODAY" > "$LASTRUN_FILE"
        /usr/bin/osascript -e 'display notification "远程 routine 今日已完成，本机自动让位" with title "锆铌·每日巡检" sound name "Glass"' >/dev/null 2>&1 || true
        log "==== ceded to remote ===="
        exit 0
    fi
    log "origin/main 今天暂无 DAILY_REVIEW.md 提交，本机接力跑"
else
    log "git fetch origin main 失败（不致命，继续走本机流程，由 claude 内部处理 push 冲突）"
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
else
    EXIT=$?
    log "audit FAILED (claude exit=$EXIT)"
    /usr/bin/osascript -e 'display notification "今日博客巡检未跑成功，看 ~/Library/Logs/zirconeey-daily-review.log" with title "锆铌·每日巡检" sound name "Basso"' >/dev/null 2>&1 || true
    exit "$EXIT"
fi

# ── SMTP 私密直投 ──
# claude 跑完，DAILY_REVIEW.md 顶部已更新为今天的小节。
# 不再依赖 daily-review-notify.yml → GitHub Issue → owner 邮件订阅这条脆链路
#（远程 routine 因 GitHub App push 权限问题一直 403，commit 没进 origin，workflow 触发不了；
#  即使触发，issue assignee 通知依赖 GitHub 通知设置和注册邮箱，不够可靠）。
# 这里直接抽出当天小节 → 转 HTML → 复用 email_summary_imap.py 的 SMTP send 模式发到主邮箱。
log "抽取 DAILY_REVIEW.md 顶部当天小节、转 HTML、SMTP 直投..."
SECTION_HTML="/tmp/daily_review_section_${TODAY}.html"
IMAP_PY="$REPO/scripts/email_summary_imap.py"

python3 - "$REPO/DAILY_REVIEW.md" "$SECTION_HTML" <<'PY' 2>>"$LOG"
"""把 DAILY_REVIEW.md 顶部第一节抽出来转成简化 HTML 片段。
只识别巡检文档里实际出现的语法：## 日期标题、空行段落、- 列表项、
**bold**、`code`、[text](url)、裸 URL。其余原样 <pre> 兜底以保证可读。"""
import html as H
import re
import sys
from pathlib import Path

src = Path(sys.argv[1]).read_text(encoding="utf-8")
out_path = Path(sys.argv[2])

# 抽顶部第一个 ## 起、到下一个 ## 前
m = re.search(r"^## .*?(?=^## |\Z)", src, re.M | re.S)
if not m:
    out_path.write_text("<p>DAILY_REVIEW.md 没找到当天小节。</p>", encoding="utf-8")
    sys.exit(0)
section = m.group(0).rstrip()
lines = section.splitlines()

def inline(s: str) -> str:
    s = H.escape(s)
    s = re.sub(r"`([^`]+)`",
               r'<code style="background:#f3f3f3;padding:1px 5px;border-radius:3px;font-size:13px">\1</code>', s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2">\1</a>', s)
    s = re.sub(r"(?<!href=\")(?<!\">)(https?://[^\s<)]+)", r'<a href="\1">\1</a>', s)
    return s

html_parts = []
para = []
list_items = []

def flush_para():
    if para:
        html_parts.append("<p>" + "<br>".join(inline(x) for x in para) + "</p>")
        para.clear()

def flush_list():
    if list_items:
        html_parts.append("<ul style='padding-left:22px;margin:8px 0'>"
                          + "".join(f"<li style='margin:4px 0'>{inline(x)}</li>"
                                    for x in list_items)
                          + "</ul>")
        list_items.clear()

for raw in lines:
    line = raw.rstrip()
    if line.startswith("## "):
        flush_para(); flush_list()
        html_parts.append(f'<h2 style="font-size:18px;border-bottom:1px solid #e0e0e0;padding-bottom:6px;margin:0 0 16px">{inline(line[3:])}</h2>')
    elif line.startswith("### "):
        flush_para(); flush_list()
        html_parts.append(f'<h3 style="font-size:15px;color:#444;margin:18px 0 8px">{inline(line[4:])}</h3>')
    elif line.startswith("- ") or line.startswith("* "):
        flush_para()
        list_items.append(line[2:])
    elif not line.strip():
        flush_para(); flush_list()
    elif line.strip() == "---":
        flush_para(); flush_list()
        html_parts.append("<hr>")
    else:
        flush_list()
        para.append(line)
flush_para(); flush_list()

out_path.write_text("\n".join(html_parts), encoding="utf-8")
print(f"[notify] wrote {out_path} ({len(html_parts)} blocks)", file=sys.stderr)
PY

if [ -s "$SECTION_HTML" ]; then
    SUBJECT="🔍 每日巡检 ${TODAY}"
    log "SMTP 直投：$SUBJECT"
    # 国内经 Clash CONNECT 隧道（email_summary_imap.py 认这两个环境变量）
    if [[ "$NET_MODE" == proxy* ]]; then
        export IMAP_PROXY_HOST="$PROXY_HOST"
        export IMAP_PROXY_PORT="$PROXY_PORT"
    fi
    if python3 "$IMAP_PY" send "$SUBJECT" "$SECTION_HTML" >> "$LOG" 2>&1; then
        log "SMTP 直投 OK"
        /usr/bin/osascript -e "display notification \"今日博客巡检已完成，邮件已发到你邮箱\" with title \"锆铌·每日巡检\" sound name \"Glass\"" >/dev/null 2>&1 || true
    else
        log "SMTP 直投失败（巡检本身仍算 OK，邮件未投出）"
        /usr/bin/osascript -e "display notification \"巡检 OK 但邮件投递失败，看 ~/Library/Logs/zirconeey-daily-review.log\" with title \"锆铌·每日巡检\" sound name \"Tink\"" >/dev/null 2>&1 || true
    fi
else
    log "$SECTION_HTML 不存在或为空，跳过 SMTP 投递"
    /usr/bin/osascript -e 'display notification "今日博客巡检已完成（无邮件正文，看 DAILY_REVIEW.md）" with title "锆铌·每日巡检" sound name "Glass"' >/dev/null 2>&1 || true
fi

log "==== done ===="
exit 0
