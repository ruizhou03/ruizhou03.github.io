#!/usr/bin/env bash
# ============================================================
# CosyVoice 2 安装脚本 — Apple Silicon / macOS
#
# 装到 ~/cosyvoice-tts/ 下，和博客仓库隔离，不进 git。
# 可重复运行（每一步都先检查是否已完成，幂等）。
# 全程日志写到 ~/cosyvoice-tts/install.log。
#
# 用法：bash scripts/podcast/install_cosyvoice.sh
# ============================================================
set -uo pipefail

ROOT="$HOME/cosyvoice-tts"
REPO="$ROOT/CosyVoice"
MF="$HOME/miniforge3"
mkdir -p "$ROOT/ref" "$ROOT/out"
LOG="$ROOT/install.log"
exec > >(tee -a "$LOG") 2>&1

step() { echo; echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] $* ==="; }

step "CosyVoice 安装开始"
echo "目标目录：$ROOT"

# ---- 1. Miniforge（提供 conda；pynini 只有 conda-forge 有 arm64 包）----
if [ ! -x "$MF/bin/conda" ]; then
  step "下载并安装 Miniforge"
  curl -fL -o "$ROOT/miniforge.sh" \
    "https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-MacOSX-arm64.sh"
  bash "$ROOT/miniforge.sh" -b -p "$MF"
  rm -f "$ROOT/miniforge.sh"
else
  echo "Miniforge 已存在，跳过"
fi
# shellcheck disable=SC1091
source "$MF/etc/profile.d/conda.sh"

# ---- 2. conda 环境 cosyvoice (python 3.10) ----
if ! conda env list | grep -qE '^cosyvoice\s'; then
  step "创建 conda 环境 cosyvoice (python 3.10)"
  conda create -n cosyvoice -y python=3.10
else
  echo "conda 环境 cosyvoice 已存在，跳过"
fi
conda activate cosyvoice

# ---- 3. pynini（CosyVoice 文本归一化依赖）----
step "安装 pynini (conda-forge)"
conda install -n cosyvoice -y -c conda-forge "pynini==2.1.6" \
  || conda install -n cosyvoice -y -c conda-forge pynini

# ---- 4. 拉 CosyVoice 源码（含 Matcha-TTS 子模块）----
if [ ! -d "$REPO/.git" ]; then
  step "克隆 CosyVoice 仓库"
  git clone --recursive https://github.com/FunAudioLLM/CosyVoice.git "$REPO"
else
  echo "CosyVoice 仓库已存在，跳过"
fi
cd "$REPO"

# ---- 5. Python 依赖（剔除 macOS 装不上的 linux-only 包）----
step "安装 Python 依赖（已剔除 deepspeed 等 linux-only 包）"
python - <<'PY'
import pathlib
src = pathlib.Path('requirements.txt').read_text().splitlines()
skip = ('deepspeed', 'tensorrt', 'onnxruntime-gpu')
keep = [l for l in src if not l.strip().lower().startswith(skip)]
pathlib.Path('requirements.mac.txt').write_text('\n'.join(keep) + '\n')
print(f'requirements.mac.txt: 保留 {len(keep)}/{len(src)} 行')
PY
# openai-whisper 等老包的 setup.py 仍然 import pkg_resources，而 setuptools>=81
# 已经移除了它 —— 用 constraints 把构建环境里的 setuptools 钉死在 <81。
echo "setuptools<81" > /tmp/cosyvoice-constraints.txt
PIP_CONSTRAINT=/tmp/cosyvoice-constraints.txt \
  pip install -r requirements.mac.txt \
  || echo "⚠️  部分依赖安装失败，见上方日志，可能需手动处理"

# ---- 6. 下载模型权重 CosyVoice2-0.5B（约 2GB）----
step "下载模型权重 CosyVoice2-0.5B"
python - <<'PY'
from modelscope import snapshot_download
snapshot_download('iic/CosyVoice2-0.5B',
                  local_dir='pretrained_models/CosyVoice2-0.5B')
print('模型下载完成')
PY

step "全部完成 ✅"
echo "conda 环境：cosyvoice"
echo "CosyVoice 仓库：$REPO"
echo "模型：$REPO/pretrained_models/CosyVoice2-0.5B"
echo "参考音放这里：$ROOT/ref/"
