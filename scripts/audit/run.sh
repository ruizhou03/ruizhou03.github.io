#!/bin/bash
# 巡检调度入口：按日期决定跑哪些 audit。
# 由 daily-review 流程调用。
#
# 频率：
#   每天          → keywords_coverage.py、images.py、backend_pulse.py、spotcheck.py、
#                  material_type_enum.py、filename_convention.py、hover_no_media.py、
#                  sibling_crosslink.py
#   每周一(dow=1) → 加跑 dead_links.py、orphan_files.py、pii_scan.py
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
echo "本次将运行：keywords + images + backend_pulse + spotcheck + material_type_enum + filename_convention + hover_no_media + sibling_crosslink$([ "$DOW" = 1 ] && echo " + dead_links + orphan_files + pii_scan")$([ "$DOM" = 01 ] && echo " + monthly_stats")"
echo

echo "---"
"$PY" "$SCRIPT_DIR/keywords_coverage.py"

echo
echo "---"
"$PY" "$SCRIPT_DIR/images.py"

echo
echo "---"
"$PY" "$SCRIPT_DIR/backend_pulse.py"

echo
echo "---"
"$PY" "$SCRIPT_DIR/spotcheck.py"

echo
echo "---"
"$PY" "$SCRIPT_DIR/material_type_enum.py"

echo
echo "---"
"$PY" "$SCRIPT_DIR/filename_convention.py"

echo
echo "---"
"$PY" "$SCRIPT_DIR/hover_no_media.py"

echo
echo "---"
"$PY" "$SCRIPT_DIR/sibling_crosslink.py"

if [ "$DOW" = "1" ]; then
    echo
    echo "---"
    "$PY" "$SCRIPT_DIR/dead_links.py"
    echo
    echo "---"
    "$PY" "$SCRIPT_DIR/orphan_files.py"
    echo
    echo "---"
    "$PY" "$SCRIPT_DIR/pii_scan.py"
fi

if [ "$DOM" = "01" ]; then
    echo
    echo "---"
    "$PY" "$SCRIPT_DIR/monthly_stats.py"
fi
