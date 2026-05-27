# 🧰 百宝箱审查报告

> 审查日期：2026-05-26 → 05-27
> 范围：`toolbox/` 下全部 47 个项目（7 棋类 + 4 牌类 + 13 单人 + 3 派对 + 8 工作 + 10 生活 + suika 一款特例 + recipes 列表页）
> 模式：审查期间 AUDIT_MODE 开启，本报告由主对话整合 7 组并行 Explore agent 的发现 + 主对话亲自复核而成
> 处理建议：先看「🛑 必修」清单，再看「⚠️ 建议改」清单。误报已剔除并备注。

---

## 📌 2026-05-27 处理状态

| 项 | 状态 | commit |
|---|---|---|
| P0① fruit-ninja 缺 games-shell | **误报** — mount 在外部 [fruit-ninja.js:3104-3146](assets/js/fruit-ninja/fruit-ninja.js#L3104-L3146)，后端排行榜已有真实玩家分数（curl 验证：进击的Jason 3171） | — |
| P0② blackjack/solitaire nick_taken alert | **已修** — 24 文件统一改 NickPrompt.showError | `2437307` |
| P1 41 文件 / 201 处 :hover 未守卫 | **已修** — scripts/wrap-hover.py 一次性脚本批处理 | `838ccc6` |
| P2 forest 计时器后台漂移 | **已修** — visibilitychange visible 时立即 tick() 对齐 wall-clock | `9843ee8` |
| audit 脚本三条误报启发式 | **已修** — bare_dollar 跳 $\d+/\d+$ 分数 / bare_url 跳整行含 [.] 钓鱼示例 / backend_pulse 分类 HTTP 错误码 | `a54ee7b` |
| P3 drawing 房主转移 UI | 不阻塞，后端早已支持，无投诉，延后 | — |
| P3 citation alert/confirm → 内联 | 功能正常仅 UX，延后 | — |
| P3 converter 扩展单位（体积/能量） | 看用户需求，延后 | — |
| P4 tax-bracket / countdown / goals / timemachine 边界 | 数据时效/边界，每年人工巡一次 | — |
| P4 pitch 麦权失败引导 | 小 UX 优化，延后 | — |

**关键教训**（已写进 [复核备注](#-复核备注误报记录) 末尾）：Explore agent 遇到 HTML 引入外部 JS 必须主动跟读那个 JS，否则会把“看不见”误报为“缺失”——本轮 fruit-ninja / tiaoqi 都是同一类错。

---

## ⚡ TL;DR

| 类别 | 严重 🛑 | 建议 ⚠️ | 误报已剔 |
|------|--------|--------|---------|
| 棋类 7 | 0 | 4（chess/tiaoqi/feixingqi hover；chess auto-join 1 处） | tiaoqi“无 auto-join”——其实逻辑在外部 JS，已确认有 |
| 牌类 4 | 1（blackjack/solitaire alert 阻塞；后述合并） | 1 | 0 |
| 单人 A 7 | 0 | 7（2048/snake/minesweeper/runner/leap hover；2048/snake alert；suika DPR） | suika“未统一”——故意独立架构 |
| 单人 B 7 | 1（fruit-ninja 完全缺 games-shell） | 5 | breakout“无续局”——tagline 本就没声称续局；typing“无 scoreAsc”——默认 false 就是它想要的 |
| 派对 3 | 0 | 3（dare/werewolf/drawing hover） | dare innerHTML“XSS”——`p.id` 是自动生成的 `P1..PN`，不接受用户输入 |
| 工作 8 | 0 | 8（各类细节，无阻塞 bug） | 0 |
| 生活 10 | 0 | 5（pitch 麦权 UX / countdown 节日到 2030 / goals localStorage 版本 / timemachine 闰年） | 0 |
| **合计** | **2** | **33** | **5 条已澄清** |

整体很健康：**全站无明显安全/功能阻塞 bug**，问题集中在两类：
1. **CSS `:hover` 未守卫** — iOS/安卓触屏长按后样式卡在 hover 态。多款游戏受影响。
2. **fruit-ninja 漏接 games-shell** — 排行榜/昵称/comments/settlement 全缺。

---

## 🛑 必修（2 项）

### 1. `fruit-ninja` 完全没接入 games-shell

**file**: [toolbox/fruit-ninja/index.html:1](toolbox/fruit-ninja/index.html)
- 全文 372 行，0 次 `GamesShell` 引用
- 没引 `identity.js / leaderboard.js / comments.js / nick-prompt.js / settlement.js / games-shell.css`
- 后果：玩家分数不上排行榜、没有结算昵称卡、没有评论区

参照 [toolbox/breakout/index.html:365-370](toolbox/breakout/index.html#L365-L370) 的引法和 [toolbox/breakout/index.html:886-913](toolbox/breakout/index.html#L886-L913) 的 mount 代码补全即可。后端 `api/lb.js GAMES` 字典需要加 `fruit-ninja` 一行（`scoreAsc: false`，可考虑用 `mode` 分桶（经典/计时/禅模式三模式））。

### 2. 起昵称仍走阻塞 `alert()`（blackjack / solitaire）

- [toolbox/blackjack/index.html:1054](toolbox/blackjack/index.html#L1054) — `alert('"' + nick + '" 已被别的玩家占用…')`
- [toolbox/solitaire/index.html:1207](toolbox/solitaire/index.html#L1207) — 同样文案的 alert

memory [[project_games_batch_2026_05]] 记录“全站 wins-leaderboard 游戏已无 prompt() 阻塞”，但这两款 leaderboard 类游戏的 `nick_taken` 错误处理仍是 alert。应改成「NickPrompt 卡片错误提示」（参考 reversi/guandan 的 `nick_taken` 处理路径：`clearNick` → `NickPrompt.refresh().show()` 内联红字提示）。

---

## ⚠️ 建议改（按类目）

### A. CSS `:hover` 未用 `@media (hover: hover)` 守卫

iOS/安卓 tap 后 hover 样式会粘住，需要重新 tap 别处才消。审查脚本 [hover_no_media.py](scripts/audit/hover_no_media.py) 设计来抓这类，每天跑。当前命中：

| 文件 | `:hover` 行 |
|------|-----------|
| [toolbox/chess/index.html:226](toolbox/chess/index.html#L226) | `.ch-promotion-choice:hover` |
| [toolbox/tiaoqi/index.html:101](toolbox/tiaoqi/index.html#L101) | `.tq-corner-chip:hover:not(:disabled)` |
| [toolbox/feixingqi/index.html:145](toolbox/feixingqi/index.html#L145) | `.fxq-corner-chip:hover` |
| [toolbox/feixingqi/index.html:167](toolbox/feixingqi/index.html#L167) | `.fxq-corner-chip.locked:hover` |
| [toolbox/2048/index.html:64-75](toolbox/2048/index.html#L64-L75) | 2 处 |
| [toolbox/snake/index.html:93-104](toolbox/snake/index.html#L93-L104) | 2 处 |
| [toolbox/minesweeper/index.html:115-126](toolbox/minesweeper/index.html#L115-L126) | 2 处 |
| [toolbox/runner/index.html:120](toolbox/runner/index.html#L120) | `.overlay-btn:hover`（有 `@media (hover: none) and (pointer: coarse)` 反向覆盖，可接受） |
| [toolbox/leap/index.html:120](toolbox/leap/index.html#L120) | 同上 |
| [toolbox/breakout/index.html:93-104](toolbox/breakout/index.html#L93-L104) | 2 处 |
| [toolbox/sudoku/index.html:87](toolbox/sudoku/index.html#L87) | `.sudoku-btn:hover` |
| [toolbox/schulte/index.html:93-104](toolbox/schulte/index.html#L93-L104) | 2 处 |
| [toolbox/memory/index.html:93-104](toolbox/memory/index.html#L93-L104) | 2 处 |
| [toolbox/dare/index.html:62](toolbox/dare/index.html#L62) | `.player-count-chips button:hover` |
| [toolbox/dare/index.html:290-301](toolbox/dare/index.html#L290-L301) | 2 处 |
| [toolbox/werewolf/index.html:41-46](toolbox/werewolf/index.html#L41-L46) | 至少 10 处 (`.ww-btn.*:hover` / `.preset-btn:hover` / `.counter-btn:hover` 等) |
| [toolbox/drawing/index.html:30-33](toolbox/drawing/index.html#L30-L33) | 多处 `.dg-btn.*:hover` |

**推荐统一改法**：每个文件 CSS 顶部加一个块：
```css
@media (hover: hover) {
  /* 把所有 :hover 规则搬进这块 */
}
```
（或者按 runner/leap 的反向写法：保留 `:hover`，但在 `@media (hover: none) and (pointer: coarse) { ... }` 内把这些选择器的 hover 副作用重置回默认。两种都行。）

### B. 棋类对战

- **chess auto-join 已有** ([toolbox/chess/index.html:1567](toolbox/chess/index.html#L1567) `chAutoJoin`)，但首轮 Explore agent 因函数名不同没找到、误报。✅ 复核通过。
- **tiaoqi 联机功能完整** ([assets/js/games/tiaoqi.js:1556](assets/js/games/tiaoqi.js#L1556) `tqAutoJoin`)。Agent 因为只看到 HTML 418 行误以为缺少，实际 1599 行逻辑在外部 JS。✅ 复核通过。
- **drawing 房主转移**: 后端 `/api/draw` 支持 `transferTo` action（错误码里有 `host_must_transfer_or_dissolve` / `already_host`），但 drawing 前端走的是「解散」模型未做转移 UI。memory [[project_room_feature]] 也提过此事。**当前没有引导用户误点导致 404**，所以可以等后续再补。

### C. 单人游戏 B 组

- **breakout 续局**：tagline 是「弹球消砖 + 三速度」，没声称续局，所以**不缺**。Agent 误读了我审查提示里的“breakout 也声称续局”——是我提示给错信息。✅ 误报。
- **typing scoreAsc**：[toolbox/typing/index.html:709-720](toolbox/typing/index.html#L709-L720) 没显式设 scoreAsc，默认 `false`。WPM 越高越好就该 false。✅ 误报。
- **sudoku/tetris innerHTML 模板字符串**：agent 说“混入用户数据”，复核后是 `difficulty` 标签 + 数字格式化，不接受用户字符串输入。✅ 误报。
- **fruit-ninja 触屏切水果**：372 行里没看到 `pointerdown/pointermove` 处理，但代码不全审查（可能用 `touchstart`）。值得真机测一下。

### D. 工作 8 款

- **citation**: `alert` (L670) / `confirm` (L739) 阻塞，应改成内联提示。低优先级。
- **converter**: 单位类别只支持长度/重量/温度（无体积/能量），与 tagline「单位换算」预期略有落差。是否扩展看用户需求。
- **converter API 失败兜底**: 单次失败直接走 baseline，无重试。可接受。
- **forest 计时漂移**: 未见 Page Visibility API 处理，后台标签页 `setInterval` 会漂。计时器精度可换成 `performance.now()` + `requestAnimationFrame`。番茄钟核心场景影响明显。
- **forest localStorage**: 无 `quotaExceeded` 兜底。
- **tax-bracket 数据时效**: IRS 2026 brackets 已标注来源 “Rev. Proc. 2025-32"。州税 PA 0.0307 需手动确认是否 2026 最新。

### E. 生活 10 款

- **pitch 麦权 UX**: 移动端 `getUserMedia` 失败时只显示「被拒绝」文字，没引导去系统设置开权限。
- **countdown 节日预设**: hardcoded 2025-2030，2031 后会变空 list。每年人工维护 ok，或后续接 lunar 库。
- **goals localStorage v1**: 无 schema 升级路径；目前字段增改靠默认值兜底，长期维护需注意。
- **timemachine 闰年**: `mmddToDayOfYear()` 按 2024 闰年算累计日数，2/29 数据展示无明显问题但累计偏移有 1 天上限。
- **picker 外部 JS**: [assets/js/games/picker.js](assets/js/games/picker.js) 1064 行，所有 `innerHTML` 用 `escapeHtml()` 包过，✅ 安全。

---

## ✅ 整体良好的项目

复核确认无重大问题：

- **gomoku / xiangqi / reversi / connect4** —— 全套通过
- **guandan** —— NickPrompt 卡片、wins-leaderboard 分桶、AI 三档全部完整
- **solitaire 续局** —— `GamesShell.SaveState.create()` + 浮层完整 ([toolbox/solitaire/index.html:1366-1378](toolbox/solitaire/index.html#L1366-L1378))
- **tetris 续局 + 排行榜** —— SaveState、leaderboard、scoreAsc 都对
- **sudoku 续局** —— SaveState 完整、按难度分桶
- **schulte / memory / breakout / blackjack / typing** —— 排行榜接入、分桶正确
- **suika** —— `.sk-*` 前缀、`/api/suika` 独立接口、`touch-action: none` 都是按既定独立架构，**不要套 games-shell**（memory 明确指示）
- **werewolf** —— probeLobby、房主转移、在线状态圆点齐全（除 hover 守卫外无重大问题）
- **drawing** —— 后端 wiring 完整，在线状态变暗+图标已实现
- **citation / random / compound / tax-bracket / converter / time / vocab** —— 核心算法正确、XSS 防护到位
- **recipes / vision / metronome / picker / grouper / roll-call / countdown / goals / timemachine** —— 核心功能逻辑正确

---

## 📋 修复优先级建议

| 优先级 | 任务 | 估时 |
|--------|------|------|
| P0 | fruit-ninja 补齐 games-shell（引脚本 + Leaderboard.mount + NickPrompt + Settlement + 后端注册 fruit-ninja gameId） | 30-45 分钟 |
| P0 | blackjack / solitaire 起昵称 alert → NickPrompt 错误态 | 15 分钟 |
| P1 | 17 个 `:hover` 未守卫文件统一加 `@media (hover: hover)` 包裹（或同等 `(hover: none) and (pointer: coarse)` 反向写法） | 1 小时（可脚本化批量处理） |
| P2 | forest 计时器换 `performance.now()` + Page Visibility API 防漂移 | 20 分钟 |
| P3 | drawing 补房主转移 UI（后端已支持） | 30 分钟 |
| P3 | citation 阻塞 alert/confirm → 内联提示 | 15 分钟 |
| P3 | converter 扩展单位类别（体积/能量） | 30 分钟 |
| P4 | tax-bracket / countdown / forest / vocab localStorage schema 升级路径 | 各 10-15 分钟 |
| P4 | pitch 麦权失败时引导用户去系统设置 | 10 分钟 |

---

## 🔍 复核备注（误报记录）

避免误导，记下首轮 agent 报告错的几条：

1. **tiaoqi 无 auto-join**: 错。在 [assets/js/games/tiaoqi.js:1556](assets/js/games/tiaoqi.js#L1556)，agent 没读外部 JS。
2. **breakout 缺续局**: 错。breakout tagline 本就没声称续局；agent 误读我的审查提示。
3. **typing 缺 scoreAsc**: 错。默认 `false` 就是 WPM 排行所需。
4. **sudoku/tetris innerHTML XSS**: 错。模板字符串拼的是难度标签 + 数字，无用户字符串。
5. **dare innerHTML XSS**: 错。`p.id` 是 [toolbox/dare/index.html:684](toolbox/dare/index.html#L684) 自动生成的 `'P' + (i+1)`，不接受用户名。
6. **suika ”未统一“**: 错。suika 是 memory 明确指定的独立架构，不套 games-shell 是设计上的对。
7. **picker XSS**: 错。外部 JS 用 `escapeHtml()` 包了所有 innerHTML。

这些案例提醒：之后 Explore agent 审查时，遇到「外部 JS 引入」要主动跟读外部文件，否则容易把”看不见就是没有“误报为缺陷。
