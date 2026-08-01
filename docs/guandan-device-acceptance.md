# 掼蛋真实浏览器、设备与读屏验收

此文件只记录真实环境证据。Chrome 响应式视口模拟、Playwright WebKit 和静态
DOM 检查不能替代 Safari、Firefox、实体移动设备或读屏验收。

## Safari 自动验收

环境要求：macOS Safari，且在 Safari → 设置 → 开发者中开启“允许远程自动化”。
脚本不会自行修改该系统设置，也不会执行 `safaridriver --enable`。

```sh
node scripts/test-guandan-safari.mjs
```

脚本直接驱动系统 Safari，验证生产 marker、普通档 27 张手牌、Enter 键选牌、
显式调整顺序、dialog 焦点、Escape、`inert`、44×44px 工具栏、按钮间距和横向
溢出。脚本始终销毁 WebDriver session 并停止临时 `safaridriver`。

Safari 仍需人工完成以下三项，因为标准 WebDriver 不提供对应真实浏览器控制：

1. 浏览器缩放设为 200%，确认工具栏、手牌、操作区和所有 dialog 可见、可滚动，
   页面无横向滚动，焦点样式没有被裁切。
2. 开启 VoiceOver，以 Tab、VO+方向键和 Enter 完成开局、选牌、调整顺序、打开并
   关闭榜单；确认手牌名称、选中状态、倒计时与结果 live region 均可听懂。
3. 普通档完成“缓存当前档位离线版”后断网重载并开局；高手档只有模型 hash 校验
   完成后才允许显示离线承诺。

## 强制矩阵

每一行必须填写真实版本、设备和结果；“模拟”“静态通过”或空白均不算通过。

| 环境 | 必测项 | 版本/设备 | 结果 | 证据/备注 |
| --- | --- | --- | --- | --- |
| Chrome macOS | 键盘、dialog、390px、性能 | Chrome 实际版本 | 已通过 | 见 `guandan-release-evidence.md` |
| Safari macOS | 自动脚本、200% zoom、离线 | Safari 26.5.2 | 自动通过；人工待验收 | 生产 `20260801p7c`；剩余 zoom、VoiceOver、断网 |
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
- 200% zoom 无功能丢失或双向滚动；reduced motion 下无非必要持续动画。
- 普通档冷离线可开局；高手档未完成模型缓存时不得承诺离线。
- 刷新、断网、切后台和恢复后不泄露手牌、不丢弃仍有效的联机会话。
