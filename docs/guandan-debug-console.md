# 掼蛋开发者调试台 · 使用说明

给「改掼蛋 AI / 验收功能改动」用的一套开发者工具。分两半：浏览器内的**调试台**（暗号 `dbug` 触发）和命令行的**自对弈回归**（`sim-guandan.js regress`）。两者都对线上真实玩家不可见、对正常游戏零影响。

代码位置：
- 浏览器调试台：`assets/js/games/guandan.js`（整文件包在 IIFE 闭包里，所以调试代码必须写在文件内部——`state`/`genMoves`/`chooseAIMove` 在 `window` 上访问不到）；神经网络 Q 值出口在 `assets/js/games/guandan-dmc.js` 的 `choose(..., dbgOut)`。
- 命令行回归：`scripts/sim-guandan.js`。

---

## 一、浏览器调试台（暗号 `dbug`）

打开任意掼蛋牌桌页面，**开一局**，然后用键盘**连打 `d-b-u-g`** 四个字母（和既有的 `test` / `quad` 测试模式同一套机制，匹配「最近 4 个字母」）。右上角弹出调试面板，再打一次 `dbug` 收起。

> 安全性：种子默认 `null` ＝ 真随机（`gdRandom()` 退化成 `Math.random()`），AI 节奏默认 `run`，透视默认关。不开面板就完全等于改前行为。可以安心躺在 `main` 上。

面板四块：

### 🎲 固定牌局（种子）
- 输入框填任意数字或字串当种子，点「用此种子重开」→ 同一种子永远发同一副牌、AI 走同样的步。
- 「🎲随机重开」生成一个随机种子并锁定；「复制种子」「清除(真随机)」。
- **用途**：改完 AI，用同一个种子各跑改前 / 改后版本，逐手对比差异——点对点验收。
- 实现：`gdSetSeed()` 切到 mulberry32 PRNG；只有「洗牌发牌」和「首局先手」走 `gdRandom`（决定局面），AI 思考延迟等纯动画仍用真随机。`startMatch` 里 `_gdReseedForMatch()` 每副复位 → 同种子复现。

### ⏯ 节奏（单步 / 快进）
- 「正常」=拟人 360–680ms 延迟；「快进」=去掉延迟；「单步」=AI 不自动出，每点一次「▶ 下一步」走一手。
- **用途**：盯着 AI 一步步走、或快进刷局面。
- 实现：`scheduleAI()` 里按 `_gdAiCtl.mode` 分支；单步把待执行的 `fire` 存进 `_gdAiCtl.pending`，等按钮触发。

### 🔬 AI 透视镜（最有用）
- 点「透视：开」后，每次 AI 出牌，面板列出它**考虑过的全部候选打法 + 每手评分**，★ 高亮它实际选的那手；还显示 AI「眼里」的局面（对手最少剩几张、队友是否在赢）。
  - easy / normal（启发式）：显示 lookahead/greedy 混合分。
  - hard（DanZero 神经网络）：显示每手的网络 **Q 值**。
- 「摊牌」=上帝视角显示各家余牌（`state.revealHands`）。
- **用途**：改 AI 权重 / 逻辑时不靠猜——直接看它为什么这么出。
- 实现：`chooseAIMoveLookahead` 和 `chooseAIMove`（DMC 分支）在透视开启时把候选+评分写进 `_gdRecordXray`；DMC 的逐手 Q 值靠 `guandan-dmc.js` 的 `choose(..., dbgOut)` 出口。

### 🧩 局面注入
- 「导出局面」把当前局面写成 JSON（复用 `buildSessionSnapshot`），可手改 `hands` 再「导入局面」（复用 `restoreFromSession`，会自动把回合的时钟/AI 调度接着跑起来）。
- 选某家 + 输牌名（如 `9 9 9 9 大王`）「替换该家手牌」——快速摆出想测的牌型（不校验张数，调试用）。
- **用途**：不用从发牌一路玩到某个局面，直接摆出来开打。

---

## 二、命令行自对弈回归（`regress`）

改完 AI 给它一道**自动体检**，不用人肉打几十局凭感觉判断强弱。

```bash
node scripts/sim-guandan.js regress <候选.json> [N=400] [基线.json|DEFAULT_W] [seed=20260622]
```

输出：
- **胜率 ± 95%CI + 退化判定**：候选 vs 基线对打 N 副（每副自动 swap 座位消除先手优势）。CI 整段低于 50% → 🔴 退化；整段高于 → ✅ 更强；跨过 50% → ⚪ 无显著差异（加大 N）。
- **出牌风格对比**：并列两列的 pass 率 / 均牌数每手 / 炸弹率 / 各牌型占比——两套权重可能胜率接近但风格迥异，这表能看出来。

固定种子 ＝ 同一批牌局，**可复现**（同种子两次跑逐字一致），所以改前 / 改后能逐次对拍。

例（候选=部署的 hard 权重，基线=DEFAULT_W）：

```
$ node scripts/sim-guandan.js regress scripts/sim-guandan-best.json 400 DEFAULT_W
胜率（候选 vs 基线）：62.x% ± 5.x%   ✅ 候选显著更强
  指标          候选    基线
  pass率        55.6%   58.0%
  炸弹率        12.6%   13.1%
  三带二        18.6%   18.9%   …
```

### ⚠️ 一个前提：sim 自带一套引擎副本
`sim-guandan.js` 里有一份**独立的引擎实现**（`classify`/`beats`/`genMoves`/`moveUtility`/`rolloutValue`），镜像 `guandan.js` 的启发式 AI。所以：
- **改的是权重向量**（`WEIGHTS_BY_DIFFICULTY` 那些数）→ 直接 `regress` 测，准。
- **改的是引擎逻辑**（genMoves / 评分函数本身）→ 必须同步改 `sim-guandan.js` 那份引擎，否则 `regress` 测的还是旧逻辑。
- DanZero 神经网络（hard 档实战用的）不在 sim 里——sim 只测启发式权重。神经网络的行为只能在浏览器透视镜里看。

### 运行成本
lookahead depth-2 较重，约 3.8s/副。要 ±5% 置信度需 ~400 副（约 20 分钟）；快速看趋势用小 N（如 40，约 2.5 分钟，CI ±15%）。

`sim-guandan.js` 其它子命令不受影响：`sanity` / `tune` / `es-tune` / `pop-gen` / `tournament` / `compare`。

---

## 三、典型工作流

**「我调了 hard 难度的权重，想确认没变弱」**
1. 把当前部署的 hard 权重存成 `baseline.json`，调好的存成 `cand.json`。
2. `node scripts/sim-guandan.js regress cand.json 400 baseline.json` → 看胜率判定 + 风格表。
3. 浏览器里开 hard 局、`dbug`、开透视镜，锁个种子实际打几手，看新权重的候选评分是否符合预期。

**「AI 在某个局面出了一手蠢牌，想查为什么」**
1. 浏览器复现到那个局面（或用「局面注入」直接摆出来）。
2. `dbug` → 开透视镜 → 单步走到那一手 → 看候选列表里它给每手打了多少分、为什么选了那手（评分最高的就是它选的）。

**「改了出牌逻辑（不只是权重）」**
1. 同步改 `sim-guandan.js` 里对应的引擎函数。
2. `regress` 跑回归（cand=改后逻辑需要落成可加载的形式，或直接改 DEFAULT_W 对比）。
3. 浏览器透视镜核对候选生成是否正确（`genMoves` 应 ≈ 平台 actionList）。

---

相关：`docs/guandan-ai-upgrade-memo.md`（DanZero 权重白嫖与集成备忘）。
