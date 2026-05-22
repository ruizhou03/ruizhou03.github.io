#!/usr/bin/env bash
# 把生成好的 mp3 上传到 Cloudflare R2。
# 需先 brew install rclone，并 rclone config 配好一个 S3/Cloudflare remote（见 README.md）。
#
# 用法：upload.sh <path-to-mp3>
set -euo pipefail

MP3="${1:?用法: upload.sh <path-to-mp3>}"
[ -f "$MP3" ] || { echo "文件不存在：$MP3"; exit 1; }

: "${R2_REMOTE:=r2}"
: "${R2_BUCKET:=zircon-podcast}"
: "${R2_PREFIX:=p}"

DEST="${R2_REMOTE}:${R2_BUCKET}/${R2_PREFIX}/$(basename "$MP3")"
echo "上传 $MP3  ->  $DEST"
rclone copyto "$MP3" "$DEST" --progress --s3-no-check-bucket
echo "✅ 已上传：${R2_PREFIX}/$(basename "$MP3")"
