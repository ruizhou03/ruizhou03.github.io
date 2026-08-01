# 斗地主 Gate 8 发布与回滚记录

发布日期：2026-08-01

## 发布候选

- 前端资源标记：`20260801g8c`
- 前端 Git SHA：`02a92e678179c1b2e8e8869d40c712225d013cac`
- 后端 Git SHA：`6c6d9069511103c70b3e77ffab2da0fefd83eb30`
- 后端 Fly release：`v150`，image `deployment-01KYYNG94QB6HBCR11YVXWGYDQ`
- 兼容前端回退点：`01322a9f`（Gate 7）
- 最近后端回退点：Git `412df0bad2de4b2a1140172f8ab239213784aa8d`，Fly release `v149`，image `deployment-01KYYMQYXZP5KEXBXVKESKETY9`
- Gate 7 兼容基线：Git `4dde65d3176543b841720699e271ecd1efd337ed`，Fly release `v147`，image `deployment-01KYYJ5R8X906033QYCBXKE7C1`

## Canary 顺序

1. 先发布保留旧字段的后端，并核对 `/health/ready` 的 Git SHA。
2. 旧版 `g7a` 前端连接新后端，确认普通联机不受影响。
3. 发布 `g8a` 前端解除“大神”联机选项；Gate 8 终验发现问题后依次发布 `g8b` 焦点修复和 `g8c` 完成房间清理修复，规则、房间协议和结算字段均保持兼容。
4. 真实浏览器分别完成 1 人 + 2 大神 AI 与 2 真人 + 1 普通 AI 整局，并结合 Gate 3 已完成的三个隔离真人客户端证据复核 SSE、轮询、断线恢复、幂等和零和结算。
5. 检查 readiness：无 5xx、无锁冲突、无 CAS 冲突、无 AI fallback，再结束 canary。

## Canary 结果

- 最终 GitHub Pages deploy run `30701720540` 与 build-check run `30701720925` 均成功；前一版 `g8b` 的 deploy `30701169776` 与 build-check `30701170177` 亦成功。
- Chrome 生产页面完成 `g7a` 到 `g8a` 的离线缓存迁移，“大神”联机选项可用；房间 `3708` 完成 1 真人 + 2 大神 AI 整局，农民获胜，净分 `+16 / +8 / -24 = 0`，浏览器无 warning/error。
- 两个不同本地 origin 的隔离 Chrome 客户端经生产 Pages 资源与生产 Fly API 完成房间 `3331` 的 2 真人 + 1 普通 AI 整局；大厅双方均显示 `3/3`，结算为 Gate8B `+1`、AI `+1`、Gate8A `-2`，两端角色、胜负与累计积分一致且总和为 `0`，应用 warning/error 为 `0`。
- 终验发现并消灭两个 P0：`804b66d3` 将斗地主焦点陷阱限定到自身两个 dialog，避免站点级隐藏搜索/助手面板夺走昵称焦点；`02a92e67` 让最终结算后的房主退出发送 `dissolveOnLeave + purgeCompleted`。修复版 `g8c` 恢复房间 `3331` 后执行真实退出，Redis 精确验证 `ddz:room:3331=0`、`ddz:fence:3331=0`。
- 三客户端两盘生产 synthetic 房间 `7717` 到达第 2 盘最终 settlement，幂等重放、陈旧版本拒绝、客户端榜单伪造拒绝、零和结算和完成房间清理均通过。首次最终 readiness 连接遇到 10 秒 TCP timeout；随后有界重试通过，并已把相同的一次重试固化到定时 synthetic。
- 最终 readiness build 与本节 SHA 一致；`errors5xx=0`、`lockConflicts=0`、`casConflicts=0`、`aiFallbacks=0`，无 code lease 泄漏。
- 后端全量测试：97 项 Node 测试、27 项规则测试、2002 项引擎测试、5524 项房间桥接测试，全部通过。

## 运行时开关

- `DDZ_ONLINE_ENABLED=0`：关闭联机入口，单机不受影响。
- `DDZ_SSE_ENABLED=0`：关闭 SSE，客户端回退轮询。
- `DDZ_MASTER_ONLINE_ENABLED=0`：只关闭“大神”联机 AI，其余联机继续可用。

开关均由 readiness 的 `doudizhu.metrics.features` 暴露，值变更后先验证 readiness，再决定是否回滚二进制。

## 回滚演练

回滚目标已经通过 `flyctl releases -a zircon-urge --json` 解析到具体 release 与不可变 image；演练只解析目标，不对生产流量执行破坏性切换。

1. 首选止血：把对应 Fly secret/variable 设为 `0`，部署并核对 readiness 中的 feature 值。
2. 后端二进制回滚：优先 `flyctl releases rollback 149 -a zircon-urge`，随后确认 `/health/ready` 的 build 为 `412df0b...`，并跑斗地主生产 smoke；若协议兼容性异常，再回到已验证的 Gate 7 `v147`。
3. 前端回滚：在隔离 worktree 中对 `01322a9f` 做正常的反向发布提交并推到 `main`；不得清空 Redis，也不得删除活跃房间。
4. 恢复前验证旧、新前端都能读取保留字段；只有 orphan 房间逐个核验后才可清理。

## 验收边界

- 真实浏览器证据不能用静态测试替代。
- 三真人隔离客户端、强制轮询、刷新恢复和两轮零和结算沿用已完成的 Gate 3 生产证据，不重复制造昂贵牌局。
- Gate 8 新增验证聚焦最终 `g8c` 缓存迁移、大神在线 AI、2 真人 + 1 AI、生产 SHA、运行指标、完成房间原子清理与回滚目标。
