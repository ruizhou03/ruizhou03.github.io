#!/bin/bash
# pre-commit hook：对暂存区新增的 _notes/**/*.md 跑发表前检查 + 自动修复。
# 可自动修：caption markdown 残留、SVG 中文斜体、裸 $ 金额、CJK 紧贴空格
# 不自动修：裸 URL（需人工判断链接文字才好看）
#
# 安装：ln -sf ../../scripts/hooks/pre_commit_check.sh .git/hooks/pre-commit
# 跳过：SKIP_PUBLISH_CHECK=1 git commit
set -euo pipefail

if [ "${SKIP_PUBLISH_CHECK:-0}" = "1" ]; then
  exit 0
fi

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
CHECKER="$REPO/scripts/pre_publish_check.py"

command -v python3 >/dev/null 2>&1 || exit 0
[ -f "$CHECKER" ] || exit 0

# 只检查新增的 _notes/*.md（新文章发表）；修改已有文件不拦
STAGED=$(git diff --cached --name-only --diff-filter=A -- '_notes/' 2>/dev/null | grep '\.md$' || true)
if [ -z "$STAGED" ]; then
  exit 0
fi

# Step 1：自动修复可修项 + 报告不可修项
set +e
OUTPUT=$(python3 "$CHECKER" --staged --fix 2>&1)
RC=$?
set -e

echo "$OUTPUT"

# Step 2：重新 stage 被改过的文件（修复已写盘但未 stage）
for f in $STAGED; do
  if [ -f "$REPO/$f" ]; then
    git add "$REPO/$f" 2>/dev/null || true
  fi
done

# Step 3：只替不可自动修项（裸 URL）挡提交
UNFIXABLE=$(echo "$OUTPUT" | grep -cF "[裸 URL:" || true)
if [ "$UNFIXABLE" -gt 0 ]; then
  echo
  echo "⛔ 以上裸 URL 无法自动修复——请改成 [文字](url) 或 <url>，然后重新提交。"
  echo "   或设 SKIP_PUBLISH_CHECK=1 跳过本次。"
  exit 1
fi

exit 0
