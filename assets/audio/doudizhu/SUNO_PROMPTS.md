---
title: 斗地主音频 — Suno 生成提示词
---

# 斗地主音频清单 + Suno 提示词

每首音乐都在 [suno.com](https://suno.com/) 创建：右上角 **Create** → **Custom Mode** → 把下面”Style of Music”和”Title”复制进去 → 留空 lyrics 让它纯器乐 → Generate → 试听 → 把满意的那一版 **Download MP3**，按 **目标文件名** 重命名后放到 `assets/audio/doudizhu/` 即可。

代码里的 `manifest.json` 已经把文件名都对应好了，**只要文件出现在目录下，下次刷新页面就生效，不用改任何代码**。

## ⚠️ 关于时长（重要）

Suno 默认每首 ~2–4 分钟。**Custom Mode 里没有直接的”限时长”开关**，提示词里写”15 seconds” 它也只是参考、不强制。两条建议：

- **稳妥做法**：让它生成完整版，下载后用 [Audacity](https://www.audacityteam.org/)（免费）截一段 10–15 秒、首尾各 100 ms 淡入淡出，循环就不会有”咯噔”声。
- **省事做法**：每条 prompt 我都写了 `(short instrumental loop, ~15 seconds, no intro, ends abruptly)` 之类指令，**生成时长会从 ~3 分钟降到 ~30-60 秒**，再截一下就行；但偶尔还是会生成长版本，重新 Generate 一次即可。

BGM 类型都建议开 **Instrumental** 开关，避免人声。SFX 太短 Suno 经常做成”曲子”，可以去 [freesound.org](https://freesound.org/) 找现成 CC0 替代（每条 prompt 里都列了备选关键词）。

---

## BGM 1 — 默认背景乐（欢快版）

**目标文件：** `bgm-default.mp3`
**触发：** 进入游戏即开始循环，没有特殊事件时一直放
**时长建议：** 10–15 秒可循环

**Title:** `Doudizhu Upbeat Loop`

**Style of Music:**
```
upbeat playful Chinese folk fusion, bright pipa picking + plucked guzheng, lively bamboo flute melody high register, light hand drum + woodblock groove, 138 bpm, cheerful festive card-room atmosphere, energetic and happy, no vocals, instrumental only, very short loop, ~15 seconds, no intro, no outro, ends abruptly
```

> 想要更国际化感觉的备选：`upbeat acoustic bossa-nova, brushed snare + claves, bright ukulele picking, glockenspiel melody high register, walking double bass, 132 bpm, cheerful sunny mood, no vocals, ~15 seconds`

---

## BGM 2 — 紧张背景乐

**目标文件：** `bgm-tense.mp3`
**触发：** 有人打出炸弹/王炸后两轮内；或任一玩家剩 ≤ 2 张牌时
**时长建议：** 8–15 秒可循环

**Title:** `Doudizhu Tension Loop`

**Style of Music:**
```
suspenseful electronic underscore, pulsing low synth bass, fast 16th-note hi-hat, sparse staccato strings, 130 bpm, building unresolved tension, no drop, no melody resolve, seamless loop, no vocals, instrumental only, very short loop, ~15 seconds, no intro, no outro, ends abruptly
```

---

## SFX 1 — 炸弹

**目标文件：** `sfx-bomb.mp3`
**触发：** 任一玩家打出炸弹（4 同张）
**时长建议：** 0.6–1.2 秒

**Title:** `Card Bomb Hit`

**Style of Music:**
```
short impact, deep boom + metallic ring + brief shimmer, no music, sound effect only, 1 second, ends abruptly, no intro
```

> Suno 偏音乐不太擅长 1 秒纯音效。如果生成的太”曲化”，可以去 [freesound.org](https://freesound.org/) 搜 “explosion impact short” / “anime card slap” 找现成的 CC0 替代。

---

## SFX 2 — 王炸

**目标文件：** `sfx-rocket.mp3`
**触发：** 任一玩家打出王炸（大小王）
**时长建议：** 1.2–2 秒

**Title:** `Card Rocket Burst`

**Style of Music:**
```
short impact + brass fanfare hit + cymbal swell, triumphant brief burst, no melody, sound effect, 2 seconds, ends abruptly, no intro
```

> 备选：去 freesound.org 搜 “victory fanfare short” / “boss reveal stinger”

---

## SFX 3 — 顺子

**目标文件：** `sfx-straight.mp3`
**触发：** 任一玩家打出顺子（≥5 张连张）
**时长建议：** 0.5–1 秒

**Title:** `Card Run Swoosh`

**Style of Music:**
```
ascending harp glissando + soft chime, smooth quick sweep, no melody, 0.8 seconds, ends abruptly, no intro
```

> 备选：freesound.org 搜 “harp glissando short” / “ui card swipe”

---

## SFX 4 — 连对

**目标文件：** `sfx-pair-straight.mp3`
**触发：** 任一玩家打出连对（≥3 对连续）
**时长建议：** 0.5–1 秒

**Title:** `Card Pair Run Chime`

**Style of Music:**
```
two layered bells ascending in pairs, marimba doubled, light shimmer, 0.8 seconds, ends abruptly, no intro
```

> 备选：freesound.org 搜 “marimba ascending short” / “ui chime double”

---

## SFX 5 — 飞机

**目标文件：** `sfx-plane.mp3`
**触发：** 任一玩家打出飞机（≥2 个连续三条带等量）
**时长建议：** 0.8–1.4 秒

**Title:** `Card Plane Whoosh`

**Style of Music:**
```
airy whoosh + propeller-style flutter + sparkle tail, energetic short FX, 1.2 seconds, ends abruptly, no intro
```

> 备选：freesound.org 搜 “whoosh flutter short” / “card plane swoosh”

---

## SFX 6 — 警报（有玩家 ≤ 2 张）

**目标文件：** `sfx-alarm-2cards.mp3`
**触发：** 检测到任一玩家手牌数从 >2 变成 ≤ 2 时响一次
**时长建议：** 0.8–1.2 秒

**Title:** `Card Endgame Alarm`

**Style of Music:**
```
two-note urgent siren ping, mild reverb, attention-grabbing but not annoying, 1 second, ends abruptly, no intro
```

> 备选：freesound.org 搜 “alarm ping short” / “ui notification urgent”

---

## SFX 7 — 结算胜利

**目标文件：** `sfx-win.mp3`
**触发：** finishGame 玩家方胜
**时长建议：** 2.5–4 秒

**Title:** `Doudizhu Victory Fanfare`

**Style of Music:**
```
short triumphant fanfare, brass swell + sparkle bells, 3 seconds, ends cleanly, no vocals, instrumental only, no intro, ends abruptly
```

---

## SFX 8 — 结算失败

**目标文件：** `sfx-lose.mp3`
**触发：** finishGame 玩家方负
**时长建议：** 2.5–4 秒

**Title:** `Doudizhu Defeat Sting`

**Style of Music:**
```
short melancholy piano descending in minor key, soft strings tail, 3 seconds, ends cleanly, no vocals, instrumental only, no intro, ends abruptly
```

---

## 验收 checklist

- [ ] `bgm-default.mp3` 放到 `assets/audio/doudizhu/`，循环播没有明显咯噔
- [ ] `bgm-tense.mp3` 同上，切换时跟默认 BGM 音量接近（差别在情绪不在响度）
- [ ] 8 个 sfx 文件名严格匹配（不能改名）
- [ ] 第一次访问页面、点 “开始游戏” → BGM 起来
- [ ] 出炸弹 / 王炸 → sfx 响 + BGM 切到 tense
- [ ] 有玩家剩 ≤ 2 张 → 警报响 + BGM 切到 tense
- [ ] 结束游戏 → win/lose sfx + BGM 淡出
- [ ] 右上角 “静音” 按钮一键关全部音
