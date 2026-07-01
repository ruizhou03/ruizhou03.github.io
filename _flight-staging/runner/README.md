# 机票监控 · 自带运行器（flightwatch）

用户在网页配置 → 生成「盯票码」/ `flightwatch.json` → 在自己电脑装这个运行器，
它每天替用户盯票。**mac 优先**，Windows/Linux 后续补平台适配层。

## 设计决策（已定档）

- **AI 判断改直连厂商 API（多厂商，用户自选）**：网页里选厂商+模型生成标准值
  `provider:model`（如 `deepseek:deepseek-chat`）。Claude 走原生 anthropic SDK，
  GPT / DeepSeek / Kimi / GLM 等走 OpenAI 兼容接口。Python 收 JSON 写盘 ——
  不再用 `claude --dangerously-skip-permissions` 全权限 agent。
- **两档模式**：简单模式（阈值比价、不调 AI、桌面通知 + 本地面板、零密钥）/
  完整模式（AI 判断 + 趋势 + 邮件，需 key + 邮箱应用密码）。
- **保留并补 UI 能力**：往返 / 舱位 / 乘客类型 / 手提行李 / 到达时段 都要真支持。
- **不改用户的私人 `scripts/flight_watch*`**：这是独立新包。

## 模块规划

| 文件 | 职责 | 状态 |
|---|---|---|
| `config.py` | 盯票码 / flightwatch.json → 规范化 RunnerConfig（含 AI 厂商/模型注册表） | ✅ 已写 |
| `scrape.py` | 抓 Trip.com（在私人 scraper 基础上补 往返/舱位/乘客类型/手提/到达时段） | ⏳ |
| `judge_api.py` | 完整模式：多厂商 AI 判断（Claude 原生 / OpenAI 兼容）+ 趋势 + 目标价 | ✅ 已写（桥+分发+判定/去重离线验证过） |
| `judge_simple.py` | 简单模式：阈值比价、无 AI、零密钥 + 纯 Python 简报 | ✅ 已写（阈值/去重/报告离线验证过） |
| `notify.py` | 桌面通知 / 邮件（用户自己 SMTP·按域名推 host）/ 本地面板 | ✅ 已写（渲染/路由/组装离线验证过） |
| `platform.py` | darwin/win32/linux：通知 / 防休眠 / 文件年龄 / 打开文件 抽象 | ✅ 已写（mac 全实现·其余降级） |
| `flightwatch.py` | CLI 入口：run / panel / status / pause / on / uninstall | ✅ 已写（整条 pipeline 经 CLI 端到端验证过） |

## 数据流

```
盯票码/flightwatch.json ─config.py→ RunnerConfig
  → scrape.py（抓取+硬过滤）→ results
  → judge_api.py（完整）/ judge_simple.py（简单）→ verdict + report
  → notify.py（桌面/邮件/面板）
```

配置、凭证、日志、中间产物都放运行器实例目录（如 `~/.flightwatch/`），**不复用**任何
私人 `zirconeey-*` 路径。
