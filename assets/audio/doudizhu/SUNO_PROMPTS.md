---
title: 斗地主音频 — Suno 生成提示词
---

# 斗地主音频清单 + Suno 提示词

每首音乐都在 [suno.com](https://suno.com/) 创建：右上角 **Create** → **Custom Mode** → 把下面“Style of Music”和“Title”复制进去 → 留空 lyrics 让它纯器乐 → Generate → 试听 → 把满意的那一版 **Download MP3**，按 **目标文件名** 重命名后放到 `assets/audio/doudizhu/` 即可。

代码里的 `manifest.json` 已经把文件名都对应好了，**只要文件出现在目录下，下次刷新页面就生效，不用改任何代码**。

> 小贴士：Suno 单条 80 秒上限就够循环用了。BGM 类型推荐打开 **Instrumental** 开关；下载完用 [Audacity](https://www.audacityteam.org/) 截一段干净循环（5–15 秒），首尾淡入淡出 100ms，循环不会有“咯噔”声。

---

## BGM 1 — 默认背景乐

**目标文件：** `bgm-default.mp3`
**触发：** 进入游戏即开始循环，没有特殊事件时一直放
**时长建议：** 8–15 秒可循环

**Title:** `Doudizhu Lounge Loop`

**Style of Music:**
```
calm lounge jazz, soft brushed drums, walking upright bass, mellow Rhodes piano, 80 bpm, warm vintage card-room ambience, seamless loop, no vocals, no buildup, no drop
```

---

## BGM 2 — 紧张背景乐

**目标文件：** `bgm-tense.mp3`
**触发：** 有人打出炸弹/王炸后两轮内；或任一玩家剩 ≤ 2 张牌时
**时长建议：** 8–15 秒可循环

**Title:** `Doudizhu Tension Loop`

**Style of Music:**
```
suspenseful electronic underscore, pulsing low synth bass, fast 16th-note hi-hat, sparse staccato strings, 130 bpm, building unresolved tension, no drop, no melody resolve, seamless loop, no vocals
```

---

## SFX 1 — 炸弹

**目标文件：** `sfx-bomb.mp3`
**触发：** 任一玩家打出炸弹（4 同张）
**时长建议：** 0.6–1.2 秒

**Title:** `Card Bomb Hit`

**Style of Music:**
```
short impact, deep boom + metallic ring + brief shimmer, no music, sound effect only, 1 second
```

> Suno 偏音乐不太擅长 1 秒纯音效。如果生成的太“曲化”，可以去 [freesound.org](https://freesound.org/) 搜 “explosion impact short” / “anime card slap” 找现成的 CC0 替代。

---

## SFX 2 — 王炸

**目标文件：** `sfx-rocket.mp3`
**触发：** 任一玩家打出王炸（大小王）
**时长建议：** 1.2–2 秒

**Title:** `Card Rocket Burst`

**Style of Music:**
```
short impact + brass fanfare hit + cymbal swell, triumphant brief burst, no melody, sound effect, 2 seconds
```

---

## SFX 3 — 顺子

**目标文件：** `sfx-straight.mp3`
**触发：** 任一玩家打出顺子（≥5 张连张）
**时长建议：** 0.5–1 秒

**Title:** `Card Run Swoosh`

**Style of Music:**
```
ascending harp glissando + soft chime, smooth quick sweep, no melody, 0.8 seconds
```

---

## SFX 4 — 连对

**目标文件：** `sfx-pair-straight.mp3`
**触发：** 任一玩家打出连对（≥3 对连续）
**时长建议：** 0.5–1 秒

**Title:** `Card Pair Run Chime`

**Style of Music:**
```
two layered bells ascending in pairs, marimba doubled, light shimmer, 0.8 seconds
```

---

## SFX 5 — 飞机

**目标文件：** `sfx-plane.mp3`
**触发：** 任一玩家打出飞机（≥2 个连续三条带等量）
**时长建议：** 0.8–1.4 秒

**Title:** `Card Plane Whoosh`

**Style of Music:**
```
airy whoosh + propeller-style flutter + sparkle tail, energetic short FX, 1.2 seconds
```

---

## SFX 6 — 警报（有玩家 ≤ 2 张）

**目标文件：** `sfx-alarm-2cards.mp3`
**触发：** 检测到任一玩家手牌数从 >2 变成 ≤ 2 时响一次
**时长建议：** 0.8–1.2 秒

**Title:** `Card Endgame Alarm`

**Style of Music:**
```
two-note urgent siren ping, mild reverb, attention-grabbing but not annoying, 1 second
```

---

## SFX 7 — 结算胜利

**目标文件：** `sfx-win.mp3`
**触发：** finishGame 玩家方胜
**时长建议：** 2.5–4 秒

**Title:** `Doudizhu Victory Fanfare`

**Style of Music:**
```
short triumphant fanfare, brass swell + sparkle bells, 3 seconds, ends cleanly, no vocals
```

---

## SFX 8 — 结算失败

**目标文件：** `sfx-lose.mp3`
**触发：** finishGame 玩家方负
**时长建议：** 2.5–4 秒

**Title:** `Doudizhu Defeat Sting`

**Style of Music:**
```
short melancholy piano descending in minor key, soft strings tail, 3 seconds, ends cleanly, no vocals
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
