#!/usr/bin/env python3
"""Synthesize Guandan call-out clips with Qwen3-TTS, cloning the owner's reference voice.
Run in the `qwentts` conda env:
  python scripts/synth-guandan-voice.py <out_dir> <model_dir>   # 再跑 node scripts/build-guandan-voice.mjs <out_dir>
Needs PODCAST_REF_WAV / PODCAST_REF_TEXT. Skips clips that already exist.
"""
import os, sys, time
import numpy as np, torch, soundfile as sf
from qwen_tts import Qwen3TTSModel

RANKS = [('2', '二'), ('3', '三'), ('4', '四'), ('5', '五'), ('6', '六'), ('7', '七'), ('8', '八'),
         ('9', '九'), ('10', '十'), ('J', 'J'), ('Q', 'Q'), ('K', 'K'), ('A', 'A')]
CLIPS = []
for key, spoken in RANKS:
    CLIPS.append((f's-{key}', f'{spoken}！' if key == '5' else f'{spoken}。'))
    CLIPS.append((f'p-{key}', f'对{spoken}。'))
    CLIPS.append((f't-{key}', f'三个{spoken}。'))
CLIPS += [
    ('s-SJ', '小王。'), ('s-BJ', '大王。'), ('p-SJ', '对小王。'), ('p-BJ', '对大王。'),
    ('c-triple-pair', '三带二。'), ('c-straight', '顺子。'), ('c-pair-str', '连对。'),
    ('c-triple-str', '钢板。'), ('c-str-flush', '同花顺！'),
    ('b-4', '炸弹！'), ('b-5', '五炸！'), ('b-6', '六炸！'), ('b-7', '七炸！'), ('b-8', '八炸！'),
    ('b-9', '九炸！'), ('b-10', '十炸！'), ('b-joker', '天王炸！'),
    ('pass-1', '不要。'), ('pass-2', '过。'), ('pass-3', '要不起。'),
    ('e-jiefeng', '接风。'), ('e-kanggong', '抗贡。'), ('e-first', '头游！'), ('left-10', '还剩十张。'),
]

out_dir, model_dir = sys.argv[1], sys.argv[2]
os.makedirs(out_dir, exist_ok=True)
todo = [(k, t) for k, t in CLIPS if not os.path.exists(os.path.join(out_dir, k + '.wav'))]
print(f'[plan] {len(CLIPS)} clips, {len(todo)} to synthesize', flush=True)
if not todo:
    sys.exit(0)
ref_wav, ref_text = os.environ['PODCAST_REF_WAV'], os.environ['PODCAST_REF_TEXT']
device = 'mps' if torch.backends.mps.is_available() else 'cpu'
t0 = time.time()
model = Qwen3TTSModel.from_pretrained(model_dir, device_map=device, dtype=torch.float32)
prompt = model.create_voice_clone_prompt(ref_audio=ref_wav, ref_text=ref_text, x_vector_only_mode=False)
print(f'[load] {time.time() - t0:.1f}s on {device}', flush=True)
for i, (key, text) in enumerate(todo):
    t1 = time.time()
    wavs, sr = model.generate_voice_clone(text=text, language='Chinese', voice_clone_prompt=prompt)
    w = np.asarray(wavs[0], dtype=np.float32)
    sf.write(os.path.join(out_dir, key + '.wav'), w, sr)
    print(f'[{i + 1}/{len(todo)}] {key} {text} -> {len(w) / sr:.2f}s in {time.time() - t1:.1f}s', flush=True)
print(f'[done] wall {time.time() - t0:.1f}s', flush=True)
