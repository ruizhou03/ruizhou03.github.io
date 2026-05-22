#!/usr/bin/env bash
# 播客一条龙：合成 mp3 + 上传到 R2。
#
# 用法：
#   scripts/podcast/publish.sh <slug>            合成整篇 + 上传
#   scripts/podcast/publish.sh <slug> --try      只合成前 3 段试音，不上传
#
# 例：scripts/podcast/publish.sh birthday-21
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
SLUG="${1:?用法: publish.sh <slug> [--try]}"
MODE="${2:-full}"

[ -f "$HERE/config.sh" ] || {
  echo "缺 scripts/podcast/config.sh —— 先 cp config.example.sh config.sh 并填好。"
  exit 1
}
# shellcheck disable=SC1091
source "$HERE/config.sh"

SCRIPT="$REPO/audio/scripts/${SLUG}.md"
OUT="$REPO/audio/out/${SLUG}.mp3"
[ -f "$SCRIPT" ] || { echo "播客稿不存在：$SCRIPT"; exit 1; }
mkdir -p "$REPO/audio/out"

# shellcheck disable=SC1091
source "$CONDA_HOME/etc/profile.d/conda.sh"
conda activate cosyvoice

if [ "$MODE" = "--try" ]; then
  echo "▶ 试音模式：只合成前 3 段，不上传"
  python "$HERE/synth.py" --script "$SCRIPT" --out "$REPO/audio/out/${SLUG}-try.mp3" --limit 3
  echo "试听：$REPO/audio/out/${SLUG}-try.mp3"
  exit 0
fi

echo "▶ 合成整篇"
python "$HERE/synth.py" --script "$SCRIPT" --out "$OUT"

echo "▶ 上传到 R2"
"$HERE/upload.sh" "$OUT"

echo
echo "下一步：给 _notes/.../${SLUG}.md 的 front-matter 加一行  podcast: true  然后 commit。"
