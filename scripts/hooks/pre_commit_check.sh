#!/bin/bash
# pre-commit hook：对暂存区 _notes/**/*.md 跑发表前检查。
# 发现不合规项时阻止提交；设 SKIP_PUBLISH_CHECK=1 可跳过。
#
# 安装：ln -sf ../../scripts/hooks/pre_commit_check.sh .git/hooks/pre-commit
set -euo pipefail

if [ "${SKIP_PUBLISH_CHECK:-0}" = "1" ]; then
  exit 0
fi

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
CHECKER="$REPO/scripts/pre_publish_check.py"

# 只在有 Python 时跑
command -v python3 >/dev/null 2>&1 || exit 0
[ -f "$CHECKER" ] || exit 0

# 找暂存区新增/修改的 _notes/*.md
# 只检查新增的 _notes/*.md（新文章发表）；修改已有文件时不拦截（遗留问题
# 由每日 audit 巡检处理）。
STAGED=$(git diff --cached --name-only --diff-filter=A -- '_notes/' 2>/dev/null | grep '\.md$' || true)
if [ -z "$STAGED" ]; then
  exit 0
fi

# 跑检查
set +e
python3 "$CHECKER" --staged --ci
RC=$?
set -e

if [ $RC -ne 0 ]; then
  echo
  echo "⛔ 发表前检查未通过（上方 ❌ 项）。"
  echo "   修完再提交，或设 SKIP_PUBLISH_CHECK=1 跳过本次。"
  echo "   修复工具见 scripts/pre_publish_check.py 末尾提示。"
  exit 1
fi

exit 0
