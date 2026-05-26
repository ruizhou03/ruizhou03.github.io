#!/bin/bash
# PreToolUse hook（matcher: Bash）：
# 在「巡查/审查模式」下严格禁止 agent 自发 git commit。
#
# 触发条件：仓库根目录存在 .claude/AUDIT_MODE 标志文件
# 拦截规则：tool_input.command 含 `git commit`（含 `git -C ... commit`）就 block
# 用户操作方式：
#   - 启动巡查任务前：touch .claude/AUDIT_MODE
#   - 结束巡查任务后：rm   .claude/AUDIT_MODE
#   - 或在 conversation 中说「打开/关闭 audit 模式」让 Claude 替你切换
#
# 输出协议：exit 2 + stderr 信息 = 拦截并把信息透传给 Claude

set -uo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
FLAG="$REPO/.claude/AUDIT_MODE"
LOG="$HOME/Library/Logs/zirconeey-hooks.log"
mkdir -p "$(dirname "$LOG")"

# 没开 audit 模式直接放行
[ -f "$FLAG" ] || exit 0

HOOK_INPUT="$(cat || true)"
export HOOK_INPUT

CMD="$(python3 -c "
import json, os, sys
try:
    d = json.loads(os.environ.get('HOOK_INPUT', '') or '{}')
    print(d.get('tool_input', {}).get('command', ''))
except Exception:
    pass
" 2>/dev/null)"

# 只拦 git commit；git log/diff/status 等只读命令照旧
if echo "$CMD" | grep -qE '(^|[^-_a-zA-Z0-9])git[[:space:]]+([-_a-zA-Z0-9=/.: ]+[[:space:]]+)?commit([[:space:]]|$)'; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] BLOCKED git commit in AUDIT mode: $CMD" >> "$LOG"
    echo "🛑 当前处于巡查/审查模式（.claude/AUDIT_MODE 存在）— 严禁 agent 自发 git commit。" >&2
    echo "   如确实需要提交，请用户手动 commit；或先 rm .claude/AUDIT_MODE 退出 audit 模式。" >&2
    exit 2
fi

exit 0
