# 斗地主 AI 优化：群体训练 + 锦标赛分级 — 指导文件

> 给下一个 Claude Code 对话用。我们刚给 **掼蛋** 跑完一套完整流程，效果很好；现在用**同一方法论**给 **斗地主**做。本文件是自包含的 — 不需要回看上轮对话历史。

---

## 1. 目标

把斗地主 AI 的三档难度（easy/normal/hard）做成**三套独立训练出来的权重向量**，而不是同一个最强模型加噪降级。

**为什么**：旧的“加噪/降低 lookahead 深度”做法让 easy/normal AI **肉眼可见的“变笨”** —— 同样局面上手很正常下手莫名其妙。新方法是 easy AI **始终如一地按它（较弱的）策略**打 → 像在跟一个习惯不同的玩家玩，不是“在跟一个发挥不稳定的 AI 玩”。

掼蛋实测：三档头对头 hard:normal **68%**、hard:easy **75%**、normal:easy **60%**，差异明显且每档都连贯。

---

## 2. 参考资料（先读这几个）

| 文件 | 用途 |
|---|---|
| [scripts/sim-guandan.js](sim-guandan.js) | **模拟器 + ES + 锦标赛**的完整范本。`pop-gen` / `tournament` 两个核心命令直接照搬 |
| [assets/js/games/guandan.js](../assets/js/games/guandan.js) L2990-3220 左右 | **AI 决策架构**的范本：`WEIGHTS_BY_DIFFICULTY` 常量 / `aiWeights()` helper / `moveUtility` / `evaluateHand` / `chooseAIMoveLookahead` / `rolloutValue` 等等。`w` 参数怎么 thread 下来 |
| [scripts/sim-guandan-ranking.json](sim-guandan-ranking.json) | 锦标赛输出格式参考 |
| [scripts/sim-guandan-weights-final.json](sim-guandan-weights-final.json) | 三档权重的存档格式参考 |
| [.claude/plans/promising-hard-easy-hard-medium-easy-ha-sharded-quiche.md](../.claude/plans/promising-hard-easy-hard-medium-easy-ha-sharded-quiche.md) | 上一轮的完整 plan，思路一样 |

**斗地主目标文件**：`toolbox/doudizhu/index.html`（2323 行，所有 JS 内联在 HTML 里 —— 跟掼蛋的“HTML + 独立 JS”不同结构）。

---

## 3. 斗地主 vs 掼蛋 的关键差异

新对话**必须**先搞清楚这些差异再开干，否则 sim 写错了等于白跑：

| 维度 | 掼蛋 | 斗地主 |
|---|---|---|
| 玩家数 | 4 (2v2 队伍) | 3 (1 地主 vs 2 农民) |
| 角色对称性 | 对称 | **非对称**（地主拿 20 张，农民 17 张） |
| 队友 | 有（座 0+2 / 1+3） | 农民侧有，地主侧没有 |
| 多局 | 打到 A 为止（多 round） | **每局独立**（一发牌一胜负） |
| 进贡 / 抗贡 | 有 | 没有 |
| 叫地主 / 抢地主 | 无 | **有**（开局先叫/抢，产生地主+底牌+底分） |
| 加倍 / 倍数 | 我们前面加过：开局加倍 + 炸弹累乘 | 经典斗地主就有：底分 × 抢 × 加倍 × 炸弹 × 春天 |
| Wild 牌（万能牌） | 红桃级牌（逢人配） | **没有**（只有王单算大） |
| 牌型 | 单/对/三/三带二/三连对/钢板/顺子/同花顺/炸 | 单/对/三/三带一/三带二/顺子/连对/飞机/飞机带翅膀/四带二/炸/王炸 |
| 春天 / 反春天 | 没有 | **有**（地主只出过一手 = 反春天 ×2；农民没出过一手 = 春天 ×2） |
| Rocket | 没有（四王炸是炸的特例） | **大小王 = 火箭，压一切** |

**最重要的实现影响**：
- sim 的“赢家”判定要重写：斗地主单局结束就出胜负，**地主出完 = 地主赢**，否则任一农民出完 = **农民侧赢**
- AI 决策上下文从“我方/对方”变成“我是地主 / 我是农民”——utility 函数的 `partnerWinning` 概念在地主端不存在，在农民端要变成“另一个农民赢的圈”
- 权重数量可能比掼蛋少（没有 wild 相关的 wildCost，没有进贡相关的）但要加新的（炸弹倍数、春天、地主/农民非对称偏好）

---

## 4. 流程概览（5 阶段）

照搬掼蛋的流水，时间预算大概一致（~8-10 小时后台 + ~30 min 手动）：

### Phase 0：探索 + 架构梳理（先读 + 不动手）

1. **读完整个 `toolbox/doudizhu/index.html`**（2323 行）
2. 找出关键函数（grep / Explore agent）：
   - **AI 决策入口**：八成叫 `chooseAIMove` / `aiPlay` / `aiAct` / `decideAiMove` 之类
   - **手牌评估**：找 `evaluate*` / `handValue` / 散单计数 之类
   - **utility 计算 / move 排序**：找有大量硬编码数字常量的函数
   - **难度分支**：grep `'easy'` / `'normal'` / `'hard'` / `aiLevel`
   - **noise 注入**：grep `Math.random` 在 AI 决策路径里的用法
   - **lookahead / rollout**：可能没有 —— 斗地主社区版 AI 通常是 greedy
3. **列清单**：所有出现在 AI 决策路径上的硬编码数值常量（行号+含义），即“待参数化的权重”
4. 给用户出**改动地图**，让用户确认后再进 Phase 1

> 在 plan 模式下走完 Phase 0，写一个 plan 文件让用户审，再 ExitPlanMode。

### Phase 1：live AI 架构重构（不改行为，只换签名）

照搬掼蛋的做法：

1. 顶部加常量
   ```js
   const WEIGHTS_BY_DIFFICULTY = {
     hard: { /* ... 占位 */ },
     normal: { /* 同样占位 */ },
     easy:   { /* 同样占位 */ },
   };
   function aiWeights() {
     return WEIGHTS_BY_DIFFICULTY[state.aiLevel] || WEIGHTS_BY_DIFFICULTY.normal;
   }
   ```
2. **所有 AI 决策路径上的函数加 `w` 参数**，硬编码常量换成 `w.<name>`。三档**先填同一组（当前调好的）值**，行为不变，保证 commit 这一步不引回退。
3. **删除**：
   - 难度判断的 lookahead 深度切换（如果有）
   - 难度判断的噪声注入（如果有）
4. commit + push 一个“重构 only”的 checkpoint，方便回滚。

### Phase 2：写独立 Node 模拟器 `scripts/sim-doudizhu.js`

照 [scripts/sim-guandan.js](sim-guandan.js) 的骨架来：

1. **抄过来**：所有跟 DOM 无关的纯函数 —— 牌型识别 (`classify`)、出牌生成 (`genMoves`)、压牌判断 (`beats`)、`shuffle` / 发牌
2. **重写**：
   - **发牌**：54 张 → 洗牌 → 前 17 张给三家各一份，剩 3 张是底牌（地主拿走 = 20 张）
   - **叫地主**：sim 里先**简化为“座 0 永远当地主”**（消除偏差）；以后想做“叫分策略”也可以参数化
   - **游戏循环**：3 个玩家轮流，谁先空手谁那方赢。地主单独 vs 农民俩
   - **AI 决策**：抄掼蛋的 `chooseAIMoveLookahead` 模板（含 1-step 或 2-step lookahead）；如果斗地主原版没有 lookahead，加上！（lookahead 是掼蛋最大的提升来源 —— 见我上一轮 100% 胜率结果）
3. **terminal value** `teamValueAt(state, isLandlord, w)`：
   - 注意斗地主的“队”概念是非对称的
   - 地主视角：我 - (农民甲 + 农民乙)；农民视角：(我 + 队友) - 地主
   - 仍然用 `1.5 * (oppCnt - myCnt) + 0.2 * (myEff - oppEff)` 这种“剩牌数差 + eff 差”组合（掼蛋实测好用）
4. **`runMatches(weightsTest, weightsBaseline, n, rng)`**：每局 swap 地主位置抵消角色偏差 —— 一半 test 当地主、一半当农民
5. **基础 sanity**：DEFAULT_W vs DEFAULT_W = 50%。如果不是，sim 写错了，回去 debug

### Phase 3：`pop-gen` 命令（群体训练）

照搬 [scripts/sim-guandan.js](sim-guandan.js) 里的 `popGen`：

```bash
node scripts/sim-doudizhu.js pop-gen [K] [generations] [popSize] [matchesPerEval] [startSigma]
```

- **K=8** 独立 ES run，第 0 个用 DEFAULT_W 起点，其余 K-1 个用 `DEFAULT_W * (1 + Gauss(0, 0.4))` 起点
- 每 run **4 generations × 16 popSize × 50 matches**
- 每 run **保存 3 个快照**（gen 0 / mid / final）→ 24 候选
- **增量落盘**（每 run 完追加写入 `scripts/sim-doudizhu-population.json`）—— 断电不丢
- **续跑支持**（读现有文件，跳过已完成的 runIdx）—— 掼蛋断电后省了 3h

预算：~3-5 小时

### Phase 4：`tournament` 命令（锦标赛 + Elo）

照搬 [scripts/sim-guandan.js](sim-guandan.js) 里的 `tournament`：

```bash
node scripts/sim-doudizhu.js tournament [matchesPerPair]
```

- 读 `population.json` + 加 DEFAULT_W 锚点（如果有 coord-best 也加）= ~25-26 候选
- 全循环 round-robin：`N*(N-1)/2` 对 × **60 matches/pair**
- Elo 评分：初始 1500，K=24
- **增量保存**（每 20 pair save 一次 `ranking.json` + `wins-matrix.json`）—— 断电不全丢
- 输出排序后的 `scripts/sim-doudizhu-ranking.json`

预算：~3-4 小时

### Phase 5：选档 + 写回 live AI

1. 读 `ranking.json`，看 Elo 分布
2. 选档：
   - **hard** = `ranking[0]`（Elo 最高）
   - **normal** = `ranking[~50% percentile]`
   - **easy** = `ranking[~75% percentile]`，**但要满足 vs hard 胜率 ≥25%**（不取烂的）
3. **检查权重画像**：列出 hard/normal/easy 在 8-10 个关键权重上的值，确认确实是**不同策略**而不是同策略小幅扰动（如果三档权重高度相似就不行 —— 见“风险点”）
4. 头对头从 `wins-matrix.json` 里拉出 3 对胜率，写进 commit message：
   - hard vs normal 应该 ≥60%
   - normal vs easy 应该 ≥55%
   - hard vs easy 应该 ≥65%
5. **写回 live AI**：填进 `WEIGHTS_BY_DIFFICULTY` 三个槽位
6. **存档**到 `scripts/sim-doudizhu-weights-final.json`

### Phase 6：验证 + 上线

1. **Sim cross-tier 验证**（可选 —— `wins-matrix.json` 已经有数据了，但跑一次 200-match confirm 更稳）
2. **浏览器烟测**：
   - 硬刷新 https://ruizhou03.com/toolbox/doudizhu/
   - easy/normal/hard 各打 2 局
   - 看 AI 的炸弹时机、要不要、出牌大小 —— 每档应该“有自己的风格”
3. commit + push
4. **memory 索引补一条 reference** 指向 `ranking.json`

---

## 5. 实操贴士（从掼蛋经验里来）

### 5.1 防电脑睡眠

后台任务总耗时 ~6-8 小时，用户大概率要让它跑过夜。**强烈建议**：

```bash
nohup caffeinate -dimsu -t 28800 > /dev/null 2>&1 &
```

让 Mac 8 小时别睡。**插电源 + 别合盖**。掼蛋那次断电是因为没插电源，丢了 1 小时进度。

### 5.2 增量落盘（必须）

掼蛋的 `popGen` 和 `tournament` 都做了**每 run / 每 20 pair 就 write 一次盘**。断电不会重头来。直接照搬这个模式。

### 5.3 续跑逻辑

`popGen` 入口处：

```js
if (fs.existsSync(popPath)) {
  const existing = JSON.parse(fs.readFileSync(popPath, 'utf8'));
  if (Array.isArray(existing) && existing.length > 0) {
    population = existing;
    startK = Math.max(...existing.map(e => e.runIdx || 0)) + 1;
    console.log('resuming from existing population.json');
  }
}
```

`tournament` 类似 —— 读现有 wins-matrix，跳过已完成 pair。掼蛋那次断电后续跑 0 摩擦。

### 5.4 waiter pattern（让 pop-gen 完了自动起 tournament）

```bash
POPGEN_PID=$(pgrep -f "node scripts/sim-doudizhu.js pop-gen" | head -1)
( while kill -0 $POPGEN_PID 2>/dev/null; do sleep 180; done
  nohup node scripts/sim-doudizhu.js tournament 60 > /tmp/tourney.log 2>&1 &
) &
```

注意：**不要用 `pgrep -f "sim-doudizhu.js pop-gen"`**，因为 waiter shell 自己的 cmdline 也会被 pgrep 匹配到，导致永远等不到自己消失。**用 PID** 直接 `kill -0 $PID`。

### 5.5 plan mode

第一步建议进 **plan mode** 走完 Phase 0 + Phase 1 的设计，写一个 plan 文件给用户审，ExitPlanMode 让用户批准后再开干。掼蛋是这么做的，省去了很多反复。

### 5.6 prompt 模板（递给 plan agent 或 Explore agent 时）

> “我在做掼蛋 AI 的同款优化。掼蛋已经跑完了，模板代码在 [scripts/sim-guandan.js](sim-guandan.js)，live AI 重构样板在 [assets/js/games/guandan.js](../assets/js/games/guandan.js) L2990-3220。我现在要把同样的群体训练 + 锦标赛分级方法套到斗地主上。斗地主的 live 代码在 toolbox/doudizhu/index.html（2323 行，JS 内联）。帮我 …”

---

## 6. 风险点 + 缓解

| 风险 | 缓解 |
|---|---|
| **K=8 起点不够多样，全收敛到同一处** | 起点扰动 sigma=0.4。如果发现 final ranking 里三档权重高度相似，重跑加大 sigma 到 0.6 |
| **斗地主非对称导致角色偏差** | runMatches 里强制一半 test 当地主、一半当农民；如果还是不平衡，再加一半互换叫分顺序 |
| **easy 候选不连贯（出乱牌）** | 选档时检查 vs hard 胜率 ≥ 25%。如果某候选 <20% 说明它已经在乱出牌，降到上一个分位 |
| **三档差异不够明显**（hard vs easy < 65%）| 往更分散的分位选（hard=top 5%、easy=bottom 20%）；如果还不够，K 加到 12 |
| **后台 ES 中途崩溃** | 增量落盘 + 续跑（5.2 + 5.3） |
| **lookahead 太慢，sim 跑不完** | 掼蛋实测 depth=2 是甜蜜点（depth=3 不显著提升）。从 depth=2 开始；如果 sim 跑得动 depth=3 再升 |
| **斗地主有“叫分”阶段，sim 怎么处理** | 第一版先固定座 0 当地主 + 底分 1；以后想要“叫分策略”也参数化时再扩展 |

---

## 7. 必须问用户的几个决策点（进 plan mode 时一起问）

1. **lookahead 深度**：三档都用 depth=2？还是 easy=1、normal=2、hard=2？
   - 掼蛋用了“三档都 depth=2，差异只来自权重”，效果很好。推荐照搬。
2. **时间预算**：~6-8 小时熟夜跑可以？K 要不要加到 12（~10-12 小时）？
3. **斗地主特有的“叫分”环节**：sim 里固定座 0 当地主 + 底分 1 可以吗？（还是要训练叫分策略？）
4. **地主/农民非对称**：训练一组权重对地主+农民都用，还是训练 2 组（一组当地主用、一组当农民用）？
   - 第一版建议**一组通用**，简单先做出来。如果效果不好再拆。

---

## 8. 验收标准

完工后用户应该能体验到：

- ✅ Sim 里 `DEFAULT_W` vs `DEFAULT_W` 接近 50%（sanity）
- ✅ Sim 里三档头对头：hard:normal ≥60%、hard:easy ≥65%、normal:easy ≥55%
- ✅ 浏览器里三档各打 2 局，三档明显能感觉到强弱差，且**每档都连贯**（没有“上手很正常下手莫名其妙”的变笨感）
- ✅ 三档权重向量在关键参数上**确实不同**（不是同一组 ±5% 扰动）
- ✅ `scripts/sim-doudizhu-{population,ranking,wins-matrix,weights-final}.json` 4 个文件都生成并 commit
- ✅ memory 里有一条 reference 指向 ranking.json

---

## 9. 上一轮（掼蛋）的最终成果作为参考

- 训练 24 个独立模型 + 锦标赛 19500 局对决
- Elo spread 1442-1544（102 分）
- 三档 ID：hard=run2_gen0、normal=run3_gen3、easy=run6_gen3
- 关键权重画像差异（不是噪声）：

```
                        hard     normal    easy
passBase                -3.51    -2.96    -2.12   (越负越积极出)
breakMult                0.57     3.14     1.44   (越大越不愿拆组)
bombBase4               11.20     8.98     4.23   (越大用炸越谨慎)
playFinish              68.21    34.64    32.32   (越大越拼走完)
playPartnerWinPenalty  -17.24   -20.04   -11.26   (越负越让队友)
```

→ 三档策略画像：hard 战术家 / normal 守成派 / easy 冒进派

如果斗地主能跑出类似清晰的画像就成了。

---

**祝顺利。有问题可以回看 [scripts/sim-guandan.js](sim-guandan.js)，几乎所有套路都在里面。**
