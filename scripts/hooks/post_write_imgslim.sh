#!/bin/bash
# PostToolUse hook（matcher: Write）：
# 如果 Claude 用 Write 写了一个图片到仓库 files/ 或 assets/ 下，且体积 > 阈值，
# 自动跑 ~/.local/bin/imgslim 给瘦身一次。仅对常见栅格图：jpg/jpeg/png/webp。
#
# 始终 exit 0；不影响主流程。

set -uo pipefail

REPO="/Users/zhourui/Desktop/ruizhou03.github.io"
LOG="$HOME/Library/Logs/zirconeey-hooks.log"
IMGSLIM="$HOME/.local/bin/imgslim"
THRESHOLD_KB=500   # 大于 500 KB 才跑

mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] post_write_imgslim: $*" >> "$LOG"; }

[ -x "$IMGSLIM" ] || { log "imgslim 不在 $IMGSLIM，跳过"; exit 0; }

HOOK_INPUT="$(cat || true)"
export HOOK_INPUT

# 用 python3 解 JSON，把 file_path 抽出来（走 env 避免 shell 拼接踩引号）
FILE_PATH="$(python3 -c "
import json, os, sys
try:
    d = json.loads(os.environ.get('HOOK_INPUT', '') or '{}')
    print(d.get('tool_input', {}).get('file_path', ''))
except Exception:
    pass
" 2>/dev/null)"

[ -n "$FILE_PATH" ] || exit 0

# 仅处理仓库内的图片
case "$FILE_PATH" in
    "$REPO"/files/*|"$REPO"/assets/*) ;;
    *) exit 0 ;;
esac

EXT="${FILE_PATH##*.}"
EXT_LOWER="$(echo "$EXT" | tr '[:upper:]' '[:lower:]')"
case "$EXT_LOWER" in
    jpg|jpeg|png|webp) ;;
    *) exit 0 ;;
esac

[ -f "$FILE_PATH" ] || exit 0

SIZE_KB="$(stat -f%z "$FILE_PATH" 2>/dev/null | awk -v t="$THRESHOLD_KB" '{print int($1/1024)}')"
if [ -z "$SIZE_KB" ] || [ "$SIZE_KB" -lt "$THRESHOLD_KB" ]; then
    log "$FILE_PATH ${SIZE_KB}KB < ${THRESHOLD_KB}KB，跳过"
    exit 0
fi

log "imgslim 触发: $FILE_PATH (${SIZE_KB}KB)"
"$IMGSLIM" "$FILE_PATH" >>"$LOG" 2>&1 || log "imgslim 失败（不致命）"
AFTER_KB="$(stat -f%z "$FILE_PATH" 2>/dev/null | awk '{print int($1/1024)}')"
log "结果: ${SIZE_KB}KB → ${AFTER_KB}KB"

exit 0
