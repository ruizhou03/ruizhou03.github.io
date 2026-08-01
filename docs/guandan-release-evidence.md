# 掼蛋发布证据

## 当前发布合同

- release marker: `20260801p7e`
- build: `2026.08.01.phase7-e`
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
- 真实 Chrome 中普通档缓存完成后停止本机服务，页面仍从 23 项 hash 校验资源
  重载并成功开出 27 张牌。高手模型未缓存时明确不承诺离线，断源后尝试开局只
  显示下载失败，不会静默降级到普通 AI。

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

## Safari 200% 紧凑布局阶段 7D 证据（2026-08-01）

- 用户在生产 `20260801p7c` 的真实 Safari 200% 页面缩放下发现牌桌、中央出牌区、
  右侧理牌键和底部手牌相互挤压，核心对局体验不可接受；该次人工验收记为失败，
  未用“游戏属于二维布局”例外掩盖功能损失。
- `20260801p7d` 在桌面精细指针且 CSS 视口不大于 1100×700 时复用横屏紧凑牌桌：
  收起标题、归拢四个工具栏按钮、以当前玩家和手牌为中心、收起重复的一键理牌，
  并为桌面手牌保留可见横向滚动提示。牌面仍为 46×66 CSS px，不靠缩成微型牌
  冒充适配。
- 系统 Safari 26.5.2 在 1024×620 WebDriver 窗口（实际 `innerHeight=568`）通过：
  27 张牌、Enter 选牌、显式换列、三个 dialog 焦点/Escape/inert、四个 44×44
  工具栏按钮及 6px 间距、无页面横向溢出；牌桌底等于视口底，手牌底位于视口内。
- 该自动窗口没有替代真实页面缩放：生产部署后用户在 Safari 实际 200% 状态完成
  一局核心操作并明确回复 `p7d 200%通过`，因此 Safari zoom 项已通过。

## Safari 图标与局终长手牌阶段 7E 证据（2026-08-01）

- 用户在 `p7d` 真实验收中发现机器人图标异常、局终未出完玩家的手牌有时被截断。
  定位结果：头像刷新仍假定首节点是 emoji 文本，SVG hydration 后会反复插入新
  marker；局终明明渲染两行牌，父出牌槽却仍固定 70–80px 且 `overflow:hidden`。
- 头像改为单一 `.gd-avatar-icon` 受控容器，以 `data-avatar-marker` 去重并显式调用
  ZirconIcons hydration；真实 Safari 经多次手牌重绘、换列和 dialog 往返后，三个
  AI 座位均为恰好 1 个容器、1 个 SVG、0 个残留 marker 文本。
- 局终出牌槽进入 `gd-revealing` 专用状态：普通牌桌两行高度 147px，紧凑牌桌两行
  高度 135px，取消固定槽裁切；每行按真实卡宽压缩到不超过 264px。摊牌期间自动
  收起理牌、调整顺序和已失效的出牌操作，避免遮住右侧剩余手牌。
- 系统 Safari 26.5.2 在 1440×848 与 1024×568 两种实际 CSS 视口完成长手牌回归：
  三个 AI 座位分别保留 21–27 张牌，每张均存在、两行均完整包含于展开槽、页面无
  横向溢出；同时保留原有键盘、dialog、焦点恢复和 44×44 工具栏检查。
- `p7e` 提交前 P0、网络合同、AI 模型合同、PWA hash、Jekyll 构建及 10,000 条
  前端/模拟器规则差分全部通过；生产部署、release marker/API gate 也已通过。

## 真实 Chrome 冷离线阶段 7F 证据（2026-08-01）

- 使用扩展控制用户真实 Chrome，访问本机 Jekyll 构建的 `20260801p7e`，不是
  Playwright 自带 Chromium。普通档点击“缓存当前档位离线版”后，页面明确报告
  23 项基础资源已完成 hash 校验并缓存。
- 随后完全停止本机 HTTP 源站；`curl` 对同一端口得到连接拒绝。同一 Chrome
  标签仍由 Service Worker 成功重载设置页，并在无源站条件下开出普通档 27 张牌。
- 返回设置页切换高手档时，界面明确显示“高手档首次需要联网下载并校验模型；
  完成前不承诺离线”。断源状态尝试开局只显示“下载失败,点击重试（或改选普通档）”，
  没有发牌，也没有把同名高手档静默降级到启发式策略。
- 控制台仅有两条预期的 `dmc_worker_error` 警告，均来自断源后刻意触发的高手模型
  加载失败；普通档离线重载和开局没有错误。

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
- stage 7D site commit: `fd067551a85191b91713795d666a01c28cda0368`。
- stage 7D Pages build/deploy run: `30690157837`；release gate run:
  `30690158186`；完整合同、生产 marker/API gate 均成功。
- stage 7D 人工 200% 复验：Safari 26.5.2，用户明确确认通过。
- stage 7E site commit: `07408cd5238e33f2cbee0f2ca78afa7dedef7aff`。
- stage 7E Pages build/deploy run: `30694574708`，build、deploy、report 均成功。
- stage 7E release gate run: `30694574896`；确定性压缩包、PWA hash、10,000 条
  规则差分、AI、Jekyll、生产 marker/API gate 均成功。
- stage 7E 生产页面和压缩资源均返回 `20260801p7e`；线上 bundle 已确认包含
  `gd-avatar-icon`、`gd-revealing` 与 `gd-reveal-rows-` 修复标记。

## 仍需真实设备完成的强制验收

以下项目不能由当前 Chrome 会话和响应式视口模拟等价替代，必须在真实环境记录：

- 2026-08-01 能力探测：系统 Safari 26.5.2 的“允许远程自动化”已由用户开启，
  自动验收通过；当前 Mac 未安装 Firefox。完整人工矩阵见
  `docs/guandan-device-acceptance.md`。

- Safari VoiceOver/真实离线切换、Firefox；
- iPhone、Android、iPad；
- macOS VoiceOver、Windows NVDA；
- Firefox/平板的 200% zoom，以及对应实体设备的刘海/安全区和极端宽高比；

在这些证据齐全前，长期目标不得标记为 complete。
