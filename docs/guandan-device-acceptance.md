# 掼蛋真实浏览器、设备与读屏验收

此文件只记录真实环境证据。Chrome 响应式视口模拟、Playwright WebKit 和静态
DOM 检查不能替代 Safari、Firefox、实体移动设备或读屏验收。

## Safari 自动验收

环境要求：macOS Safari，且在 Safari → 设置 → 开发者中开启“允许远程自动化”。
脚本不会自行修改该系统设置，也不会执行 `safaridriver --enable`。

```sh
node scripts/test-guandan-safari.mjs
```

真实离线验收先构建站点，再让脚本拥有一个隔离的本机源站；脚本会在基础资源完成
hash 校验缓存后停止该源站、确认端口不可连接、重载并开局：

```sh
/opt/homebrew/opt/ruby/bin/bundle exec jekyll build --destination /tmp/guandan-safari-offline-site
node scripts/test-guandan-safari.mjs --check-offline \
  --offline-dir=/tmp/guandan-safari-offline-site --offline-port=4191
```

VoiceOver 人工听读前，先用同一系统 Safari 跑可自动判定的语义前置项：

```sh
node scripts/test-guandan-safari.mjs --check-a11y \
  --offline-dir=/tmp/guandan-safari-offline-site --offline-port=4192
```

脚本直接驱动系统 Safari，验证生产 marker、普通档 27 张手牌、Enter 键选牌、
显式调整顺序、dialog 焦点、Escape、`inert`、44×44px 工具栏、按钮间距和横向
溢出。离线模式还验证普通档断源重载后开出 27 张牌，以及未缓存高手模型时保持
阻断、不降级发牌；无障碍模式验证牌名和选中 live region、可查询但不逐秒打断的
倒计时、托管开关状态，以及小局结算的 dialog 名称、焦点和完整结果摘要。脚本始终
销毁 WebDriver session，并停止临时 `safaridriver` 和它自己创建的本机源站。

Safari 200% zoom 已由用户在 `p7d` 生产版本完成并确认通过；真实离线切换已由
Safari 26.5.2 的上述断源模式通过。剩余唯一需要人工完成的是 VoiceOver，因为
标准 WebDriver 不能控制或替代真实读屏：

- 开启 VoiceOver，以 Tab、VO+方向键和 Enter 完成开局、选牌、调整顺序、打开并
  关闭榜单；确认手牌名称、选中状态、倒计时与结果 live region 均可听懂。

## 强制矩阵

每一行必须填写真实版本、设备和结果；“模拟”“静态通过”或空白均不算通过。

| 环境 | 必测项 | 版本/设备 | 结果 | 证据/备注 |
| --- | --- | --- | --- | --- |
| Chrome macOS | 键盘、dialog、390px、性能、真实离线 | Chrome 150.0.7871.187 | 已通过 | `p7e` 关闭本机源站后由 SW 重载并开出普通档 27 张牌；见 `guandan-release-evidence.md` |
| Safari macOS | 自动脚本、200% zoom、离线 | Safari 26.5.2 | 自动、200% 与真实离线通过；VoiceOver 待验收 | `p7d` 生产 200% 人工通过；`p7h` 读屏语义前置回归通过 |
| Firefox desktop | 键盘、dialog、200% zoom、离线 | 待填 | 待验收 | 当前 Mac 未安装 Firefox |
| iPhone Safari | 刘海安全区、横竖屏、27 张牌、PWA | 待填 | 待验收 | 必须实体设备 |
| Android Chrome | 横竖屏、27 张牌、PWA、断网恢复 | 待填 | 待验收 | 必须实体设备 |
| iPad Safari | 分屏、横竖屏、200% zoom、PWA | 待填 | 待验收 | 必须实体设备 |
| VoiceOver | 键盘/触控浏览、名称/状态/live region | 待填 | 待验收 | macOS 或 iOS 真实读屏 |
| NVDA | 键盘、名称/状态/live region、dialog | 待填 | 待验收 | 必须 Windows + NVDA |

## 每个环境的通过条件

- setup、lobby、playing、tribute、settlement 均有明确返回路径。
- 27 张牌、长炸弹、四王和结算面板不遮住主要操作。
- 所有非牌面触控目标至少 44×44 CSS px，榜单/音效及设置/退出不重叠。
- 键盘可选牌、出牌、不要、提示和调整顺序；焦点始终可见。
- Dialog 有名称、焦点循环、Escape、背景 `inert` 和关闭后的焦点恢复。
- 200% zoom 无内容/功能丢失；页面不产生无关双向滚动，牌桌必要二维空间与手牌
  横向滚动允许保留；reduced motion 下无非必要持续动画。
- 普通档冷离线可开局；高手档未完成模型缓存时不得承诺离线。
- 刷新、断网、切后台和恢复后不泄露手牌、不丢弃仍有效的联机会话。
