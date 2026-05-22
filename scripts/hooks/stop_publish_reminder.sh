#!/bin/bash
# Stop hook：会话结束时，如果最近一次 commit 涉及 _notes/ 下的 .md（即"我们刚发/改了文章"）
# 桌面通知一下："要不要导出公众号 / 同步英文站？"
#
# 节流：同一 commit 只提醒一次（用 .last_publish_reminder.commit 文件记录）。
# 始终 exit 0；hook 不阻塞。

set -uo pipefail

REPO="/Users/zhourui/Desktop/ruizhou03.github.io"
STATE="$REPO/.audit-cache/.last_publish_reminder.commit"
LOG="$HOME/Library/Logs/zirconeey-hooks.log"

mkdir -p "$(dirname "$STATE")" "$(dirname "$LOG")"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] stop_publish_reminder: $*" >> "$LOG"; }

cd "$REPO" 2>/dev/null || exit 0

LAST_COMMIT="$(git rev-parse HEAD 2>/dev/null)" || exit 0
PREV_NOTIFIED=""
[ -f "$STATE" ] && PREV_NOTIFIED="$(cat "$STATE" 2>/dev/null)"
[ "$LAST_COMMIT" = "$PREV_NOTIFIED" ] && exit 0  # 这条 commit 已经提醒过了

# 这次 commit 是否动了 _notes/ 下的 .md？
CHANGED="$(git show --name-only --pretty=format: HEAD 2>/dev/null | grep -E '^_notes/.+\.md$' || true)"
[ -z "$CHANGED" ] && exit 0

# 进一步判断：只在 commit 内容确实是"内容文件"动作时提醒（避免 chore/daily-review）
MSG="$(git log -1 --pretty=%s 2>/dev/null)"
case "$MSG" in
    'chore(daily-review)'*|'chore: daily'*|'fix(quotes)'*) exit 0 ;;
esac

COUNT="$(echo "$CHANGED" | wc -l | tr -d ' ')"
log "刚 commit 涉及 $COUNT 个 _notes/ md，提醒同步"

/usr/bin/osascript -e "display notification \"刚发/改了 $COUNT 篇文章。考虑：① 跑 /wechat-export 导出公众号版；② 同步英文镜像 ruizhou03.github.io\" with title \"锆铌·内容发布提醒\" sound name \"Glass\"" >/dev/null 2>&1 || true

echo "$LAST_COMMIT" > "$STATE"
exit 0
