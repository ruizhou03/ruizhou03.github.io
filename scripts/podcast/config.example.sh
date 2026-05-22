# 播客流水线配置 —— 复制成 config.sh 再按你这台机器填好。
# config.sh 已被 .gitignore 忽略，不会进仓库。
#   cp scripts/podcast/config.example.sh scripts/podcast/config.sh

# CosyVoice 安装位置（install_cosyvoice.sh 默认装到这里）
export COSYVOICE_DIR="$HOME/cosyvoice-tts/CosyVoice"
export CONDA_HOME="$HOME/miniforge3"

# 周睿的参考音：固定一段录音反复复用。
# PODCAST_REF_TEXT 必须和录音内容【逐字一致】，否则克隆效果会变差。
export PODCAST_REF_WAV="$HOME/cosyvoice-tts/ref/zircon-ref.wav"
export PODCAST_REF_TEXT="在这里填参考音的逐字转写"

# Cloudflare R2：rclone 里配好的 remote 名 / bucket 名 / 路径前缀
export R2_REMOTE="r2"
export R2_BUCKET="zircon-podcast"
export R2_PREFIX="p"
