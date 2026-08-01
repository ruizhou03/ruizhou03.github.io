# 掼蛋发布证据

## 当前发布合同

- release marker: `20260801p7c`
- build: `2026.08.01.phase7-c`
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

## 真实 Chrome 阶段 7B 证据（2026-08-01）

- 通过 Chrome 扩展控制用户真实 Chrome；生产环境完成 27 张手牌、键盘 Enter
  选牌、显式“调整顺序”真实换列。
- 榜单 dialog 打开后焦点落在关闭按钮，背景有 7 个 `inert` 区域；Escape
  关闭后 `inert` 为 0，焦点回到“榜单”。榜单与交流均按需加载并成功渲染。
- 真实 Chrome 的 CSS 视口覆盖 844×390、915×412、1024×768、
  1366×300、390×844；均无页面横向溢出。该项只是 Chrome 响应式视口证据，
  不能代替对应实体手机和平板验收。
- 390×844 发现并修复 44px 工具栏按钮仍重叠 5.6px 的回归；生产
  `20260801p7b` 复测为榜单/音效和设置/退出各有 4px 间距，四个按钮均为
  44×44px，页面无横向溢出。
- 本机真实 Chrome 的 `?perf-test=1`：3 个交互样本，p75 INP 88ms；
  long task max 0ms；同步初始化 1ms。满足 INP <200ms、long task <50ms。
- Chrome 控制台只出现扩展消息通道关闭噪声；一次 Waline 读取超时后重试，
  交流区已正常渲染，因此记录为外部服务瞬时非阻断风险。

## 真实 Safari 阶段 7C 证据（2026-08-01）

- 系统 Safari 26.5.2 通过原生 `safaridriver` 驱动生产版本
  `20260801p7c`；不是 Playwright WebKit 替身。
- 首轮真实验收发现 Safari 鼠标点击按钮时不会像 Chrome 一样自动更新
  `document.activeElement`，导致 dialog 关闭后回到旧焦点。UI 控制器现由调用方
  显式传入触发按钮；榜单、设置、退出确认三个 dialog 均验证 Escape 后回到各自
  触发按钮。
- 普通档开局 27 张手牌；Enter 键真实改变 `aria-pressed`；调整顺序将第一牌列
  移至第二列，DOM 牌列顺序与 live region 同时变化。
- 榜单 dialog 打开时焦点为关闭按钮、背景 7 个区域 `inert`、body 滚动锁定；
  关闭后 `inert` 清零。设置和退出确认关闭后同样无残留 `inert`。
- 1440×848 真实 Safari 视口下四个工具栏按钮均为 44×44px，相邻间距 4px，
  页面无横向溢出。
- 尚未由自动 WebDriver 覆盖：Safari 200% zoom、VoiceOver、真实断网切换；这些
  继续保留在实体/人工强制矩阵中。

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
- stage 7B site commit: `c79e41af8766634bbf9d2e9a6b4fdfa38c6afd6b`。
- stage 7B Pages build/deploy run: `30687721330`，build、deploy、report
  均成功。
- stage 7B release gate run: `30687721718`；确定性压缩包、PWA hash、
  规则差分、AI、Jekyll 和生产 marker/API gate 均成功。
- stage 7B 生产探针：页面 200、readiness 200、unknown action 400；
  marker `20260801p7b` 首次探测即通过。
- stage 7C site commit: `2f23b9357be1fa243a01ecf1af0a1c013cd9c09f`。
- stage 7C Pages build/deploy run: `30689394862`，build、deploy、report
  均成功。
- stage 7C release gate run: `30689395055`；确定性压缩包、PWA hash、
  10,000 条规则差分、AI、Jekyll 和生产 marker/API gate 均成功。
- stage 7C 真实 Safari 生产验收：Safari 26.5.2，全部自动检查通过，且测试结束
  后 WebDriver session 与临时 `safaridriver` 均已销毁。

## 仍需真实设备完成的强制验收

以下项目不能由当前 Chrome 会话和响应式视口模拟等价替代，必须在真实环境记录：

- 2026-08-01 能力探测：系统 Safari 26.5.2 的“允许远程自动化”已由用户开启，
  自动验收通过；当前 Mac 未安装 Firefox。完整人工矩阵见
  `docs/guandan-device-acceptance.md`。

- Safari、Firefox；
- iPhone、Android、iPad；
- macOS VoiceOver、Windows NVDA；
- 真实浏览器 200% zoom，以及对应实体设备的刘海/安全区和极端宽高比；

在这些证据齐全前，长期目标不得标记为 complete。
