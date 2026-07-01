# 机票监控 · 自带运行器（flightwatch）

用户在网页配置 → 生成「盯票码」/ `flightwatch.json` → 在自己电脑装这个运行器，
它每天替用户盯票。**mac 优先**，Windows/Linux 后续补平台适配层。

## 设计决策（已定档）

- **AI 判断改直连 Anthropic API**：用用户自己的 `sk-ant` key 打 `api.anthropic.com`，
  Python 收 JSON 写盘 —— 不再用 `claude --dangerously-skip-permissions` 全权限 agent。
- **两档模式**：简单模式（阈值比价、不调 AI、桌面通知 + 本地面板、零密钥）/
  完整模式（AI 判断 + 趋势 + 邮件，需 key + 邮箱应用密码）。
- **保留并补 UI 能力**：往返 / 舱位 / 乘客类型 / 手提行李 / 到达时段 都要真支持。
- **不改用户的私人 `scripts/flight_watch*`**：这是独立新包。

## 模块规划

| 文件 | 职责 | 状态 |
|---|---|---|
| `config.py` | 盯票码 / flightwatch.json → 规范化 RunnerConfig（前端↔后端桥） | ✅ 已写 |
| `scrape.py` | 抓 Trip.com（在私人 scraper 基础上补 往返/舱位/乘客类型/手提/到达时段） | ⏳ |
| `judge_api.py` | 完整模式：直连 Anthropic API 判断便宜票 + 趋势 + 目标价 | ✅ 已写（判定/去重逻辑离线验证过） |
| `judge_simple.py` | 简单模式：阈值比价、无 AI | ⏳ |
| `notify.py` | 桌面通知 / 邮件 / 本地面板（走 platform 抽象） | ⏳ |
| `platform.py` | darwin/win32/linux：调度 / 通知 / 防休眠 / 文件年龄 / 代理探测 | ⏳ |
| `flightwatch.py` | CLI 入口：run / panel / status / pause / on / uninstall | ⏳ |

## 数据流

```
盯票码/flightwatch.json ─config.py→ RunnerConfig
  → scrape.py（抓取+硬过滤）→ results
  → judge_api.py（完整）/ judge_simple.py（简单）→ verdict + report
  → notify.py（桌面/邮件/面板）
```

配置、凭证、日志、中间产物都放运行器实例目录（如 `~/.flightwatch/`），**不复用**任何
私人 `zirconeey-*` 路径。
