#!/bin/bash
# PreToolUse hook（matcher: Bash）：
# 如果 Claude 即将执行 `git commit ...`，先用 scripts/fix_quotes.py --staged
# 把所有 staged 的 .md 正文 ASCII 直引号转中文弯引号；改过的文件 re-add 进 index，
# 保证进入 commit 的是修正后的版本。
#
# 始终 exit 0；不阻塞 commit。日志写到 ~/Library/Logs/zirconeey-hooks.log。

set -uo pipefail

REPO="/Users/zhourui/Desktop/zirconeey.github.io"
LOG="$HOME/Library/Logs/zirconeey-hooks.log"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] pre_commit_fix_quotes: $*" >> "$LOG"; }

HOOK_INPUT="$(cat || true)"

# 只对含 "git commit" 的 Bash 命令起作用
case "$HOOK_INPUT" in
    *'git commit'*) ;;
    *) exit 0 ;;
esac

cd "$REPO" 2>/dev/null || { log "cd 失败"; exit 0; }

STAGED_MD="$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null | grep -E '\.md$' || true)"
if [ -z "$STAGED_MD" ]; then
    log "本次 commit 无 staged .md，跳过"
    exit 0
fi

OUTPUT="$(python3 scripts/fix_quotes.py --staged 2>&1 || true)"
# fix_quotes 自己输出 "  path: N 处" 这种行；若全 0 它打印 "共 0 个文件 已改 0 处"
CHANGED_LINES="$(echo "$OUTPUT" | grep -E '^\s+.+: [0-9]+ 处$' || true)"
if [ -z "$CHANGED_LINES" ]; then
    log "staged .md 无需修正引号"
    exit 0
fi

# 把改过的文件 re-add 进 index
echo "$CHANGED_LINES" | awk -F: '{gsub(/^[ \t]+/,"",$1); print $1}' | while IFS= read -r f; do
    [ -n "$f" ] && [ -f "$f" ] && git add "$f"
done

CHANGED_COUNT="$(echo "$CHANGED_LINES" | wc -l | tr -d ' ')"
log "已修正引号并 re-add: $CHANGED_COUNT 个文件"
/usr/bin/osascript -e "display notification \"已自动统一 $CHANGED_COUNT 个 .md 的引号\" with title \"锆铌·commit 前 fix_quotes\"" >/dev/null 2>&1 || true

exit 0
