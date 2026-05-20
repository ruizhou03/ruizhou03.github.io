#!/bin/bash
# 巡检调度入口：按日期决定跑哪些 audit。
# 由 daily-review 流程调用。
#
# 频率：
#   每天          → keywords_coverage.py、images.py
#   每周一(dow=1) → 加跑 dead_links.py
#   每月 1 号     → 加跑 monthly_stats.py
#
# 全部输出到 stdout（markdown 格式），daily-review Claude 把它读进 context
# 再决定哪些项进 DAILY_REVIEW.md。

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PY=${PYTHON:-python3}

DOW=$(date +%u)     # 1=Mon ... 7=Sun
DOM=$(date +%d)

echo "# 站点巡检（$(date '+%Y-%m-%d %H:%M'))"
echo
echo "本次将运行：keywords + images + backend_pulse$([ "$DOW" = 1 ] && echo " + dead_links")$([ "$DOM" = 01 ] && echo " + monthly_stats")"
echo

echo "---"
"$PY" "$SCRIPT_DIR/keywords_coverage.py"

echo
echo "---"
"$PY" "$SCRIPT_DIR/images.py"

echo
echo "---"
"$PY" "$SCRIPT_DIR/backend_pulse.py"

if [ "$DOW" = "1" ]; then
    echo
    echo "---"
    "$PY" "$SCRIPT_DIR/dead_links.py"
fi

if [ "$DOM" = "01" ]; then
    echo
    echo "---"
    "$PY" "$SCRIPT_DIR/monthly_stats.py"
fi
