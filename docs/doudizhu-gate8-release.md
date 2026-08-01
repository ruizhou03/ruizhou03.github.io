# 斗地主 Gate 8 发布与回滚记录

发布日期：2026-08-01

## 发布候选

- 前端资源标记：`20260801g8a`
- 后端 Git SHA：`4dde65d3176543b841720699e271ecd1efd337ed`
- 后端 Fly release：`v147`，image `deployment-01KYYJ5R8X906033QYCBXKE7C1`
- 兼容前端回退点：`01322a9f`（Gate 7）
- 兼容后端回退点：Git `1e04907`，Fly release `v146`，image `deployment-01KYYHF9JAFBD6WYSRA2PTERA2`

## Canary 顺序

1. 先发布保留旧字段的后端，并核对 `/health/ready` 的 Git SHA。
2. 旧版 `g7a` 前端连接新后端，确认普通联机不受影响。
3. 发布 `g8a` 前端，只解除“大神”联机选项；规则、房间协议和结算字段不做破坏性变更。
4. 真实浏览器完成 1 人 + 2 AI 牌局，并结合 Gate 3 已完成的三个隔离真人客户端证据复核 SSE、轮询、断线恢复、幂等和零和结算。
5. 检查 readiness：无 5xx、无锁冲突、无 CAS 冲突、无 AI fallback，再结束 canary。

## 运行时开关

- `DDZ_ONLINE_ENABLED=0`：关闭联机入口，单机不受影响。
- `DDZ_SSE_ENABLED=0`：关闭 SSE，客户端回退轮询。
- `DDZ_MASTER_ONLINE_ENABLED=0`：只关闭“大神”联机 AI，其余联机继续可用。

开关均由 readiness 的 `doudizhu.metrics.features` 暴露，值变更后先验证 readiness，再决定是否回滚二进制。

## 回滚演练

回滚目标已经通过 `flyctl releases -a zircon-urge --json` 解析到具体 release 与不可变 image；演练只解析目标，不对生产流量执行破坏性切换。

1. 首选止血：把对应 Fly secret/variable 设为 `0`，部署并核对 readiness 中的 feature 值。
2. 后端二进制回滚：`flyctl releases rollback 146 -a zircon-urge`，随后确认 `/health/ready` 的 build 为 `1e04907...`，并跑斗地主生产 smoke。
3. 前端回滚：在隔离 worktree 中对 `01322a9f` 做正常的反向发布提交并推到 `main`；不得清空 Redis，也不得删除活跃房间。
4. 恢复前验证旧、新前端都能读取保留字段；只有 orphan 房间逐个核验后才可清理。

## 验收边界

- 真实浏览器证据不能用静态测试替代。
- 三真人隔离客户端、强制轮询、刷新恢复和两轮零和结算沿用已完成的 Gate 3 生产证据，不重复制造昂贵牌局。
- Gate 8 新增验证聚焦最终 `g8a` 缓存迁移、大神在线 AI、生产 SHA、运行指标与回滚目标。
