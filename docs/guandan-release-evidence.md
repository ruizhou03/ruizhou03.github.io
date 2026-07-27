# 掼蛋发布证据

## 当前发布合同

- release marker: `20260727p7a`
- build: `2026.07.27.phase7-a`
- rulesVersion: `gd-huaian-2025-site-v1`
- protocolVersion: `guandan-protocol-v2`
- roomSchemaVersion: `3`
- saveSchemaVersion: `3`
- AI contract: `gd-ai-contract-v1`
- hard model SHA-256: `ca389e89e8db98d9968705b0e4495620e025c852cf4db4b4c2e66b086ae03da5`

## 渐进模块边界

| 模块 | 文件 | 主程序真实调用点 |
| --- | --- | --- |
| contract | `guandan-contract.js` | 版本、schema、存储 key、API 地址 |
| rules | `guandan-rules.js` | 牌编码、权重、炸弹、牌型常量 |
| engine | `guandan-engine.js` | phase、导航状态机、队伍映射 |
| AI | `guandan-ai-contract.js` | immutable strategy ID 与模型合同 |
| DMC worker | `guandan-dmc-worker.js` | hard 推理离开主线程 |
| net | `guandan-net.js` | bearer request、no-store、requestId |
| storage | `guandan-storage.js` | 偏好、单机存档、联机会话、离线承诺 |
| UI | `guandan-ui.js` | dialog、focus trap、Escape、inert、焦点恢复 |
| audio | `guandan-audio.js` | 合成音效、静音持久化、ARIA 状态 |
| debug | `guandan-debug.js` | 仅本机暗号入口 |

这是一轮有测试保护的渐进拆分；完整牌型分类与对局流程仍在
`guandan.js`，避免在发布前进行无测试的大爆炸重写。模拟器继续直接读取
浏览器权威规则实现，而不是维护另一份产品规则。

## 自动发布门禁

`Pages build check` 在每次推送到 `main` 时执行：

1. Doudizhu 既有规则回归，避免跨游戏破坏。
2. Terser 5.43.1 确定性生产包比对。
3. 确定性 PWA 清单再生成并用 `git diff --exit-code` 阻止 hash 漂移。
4. Guandan P0、联机协议、安全合同、DOM/a11y 静态合同。
5. 10,000 条种子化前端/模拟器差分轨迹。
6. AI strategy/model SHA/golden corpus。
7. GitHub Pages 同款 Jekyll 构建。
8. 部署后生产 marker、资源、readiness 与 unknown-action 探针。

## 本地真实浏览器证据

- 主页面加载 10 个 Guandan runtime 脚本，依赖顺序正确。
- 单机进入 `playing` 后手牌为 27 张。
- “调整顺序”使选中列真实换位。
- 榜单/规则/交流 dialog 打开后背景 7 个区域进入 `inert`；焦点落到关闭按钮。
- Escape 关闭 dialog 后，`inert` 清零，焦点回到触发按钮。
- 一次干净冷启动没有大于等于 50ms 的 long task；同步初始化约 2ms。
- 普通档缓存完成后停止本机服务，页面仍从 23 项 hash 校验资源启动。

## 生产发布证据

- site commit: `944da28e09d47dd3477758dcf53367bcf327a64e`
- Pages build/deploy run: `30258502711`，build、deploy、report 均成功。
- release gate run: `30258503761`，完整合同与生产 marker/API gate 均成功。
- 生产页面：HTTP 200，`20260727p7a` 的 10 个 runtime 脚本全部加载，进入
  `playing` 后手牌 27 张。
- 后端 readiness：HTTP 200，`guandanProtocol: strict`，
  `guandanAi: worker-ready`。
- unknown action：HTTP 400，不是 500。
- 四客户端专用生产房：47 项检查通过；四个视角各只获得自己的 27 张手牌，
  无全手牌泄露；幂等开局、resume secret 轮换、旧 token 立即失效和 hard
  worker 均通过；房间已解散。
- SSE 生产 50 样本：P50 306ms、P95 390ms、max 407ms，P95 低于
  500ms 门槛；测试房已解散。

## 仍需真实设备完成的强制验收

以下项目不能由当前 macOS 内置浏览器会话等价替代，发布完成后必须在真实环境记录：

- Safari、Firefox；
- iPhone、Android、iPad；
- macOS VoiceOver、Windows NVDA；
- 对应设备的 200% zoom、刘海/安全区、极端宽高比；

在这些证据齐全前，长期目标不得标记为 complete。
