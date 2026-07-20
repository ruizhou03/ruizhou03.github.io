# 站点服务与密钥清单

> 只记录“是什么、放在哪里、丢了影响什么”，永远不记录密钥值。最后核对：2026-07-20。

## 服务地图

| 服务 | 账号 / 资源 | 代码或配置 | 数据与影响 | 恢复 / 备份 |
|---|---|---|---|---|
| GitHub | `ruizhou03/ruizhou03.github.io` | 本仓库；Pages 构建 `main` | 静态站、文章、工具、PDF | Git 历史；建议另保一份 mirror |
| GitHub | `ruizhou03/zircon-urge` | `backends/urge/` 独立仓库 | 主动态后端源码 | 2026-07-20 已把本机领先提交推回远端 |
| GitHub | `ruizhou03/zircon-comments` | `backends/comments/` 独立仓库 | Waline 后端源码 | 2026-07-20 已把本机领先提交推回远端 |
| GitHub | `zirconeey/zircon-mcp` | `backends/mcp/` 独立仓库 | 只读 MCP 包装源码 | 远端与本机一致 |
| GitHub Actions | 主仓库 Actions secrets | `.github/workflows/` | 每日快照、每周数据备份 | 2026-07-20 首次三源备份成功；secrets 只能覆盖、不能读回 |
| GitHub Pages | `ruizhou03.com` | `_config.yml`、`CNAME` | 全站静态生产环境 | push `main` 自动部署 |
| fly.io | `zircon-urge`（Singapore） | `backends/urge/fly.toml` | 账号、积分、收藏、游戏、后台、小助手 | `flyctl deploy --depot=false --remote-only --wg` |
| fly.io | `zircon-comments`（Singapore） | `backends/comments/fly.toml` | Waline 与评论管理接口 | 同上 |
| fly.io | MCP | `backends/mcp/` | 五个只读 MCP tools 的源码 | 2026-07-20 `flyctl apps list` 未发现 `zircon-mcp`，当前不能视为已部署 |
| Upstash Redis | urge 生产库 | urge 的 fly secrets | 账号、JWT 关联数据、积分、收藏、排行榜、存档等 | 每周逻辑快照；`scripts/backup/upstash_snapshot.py` |
| PostgreSQL | Waline 生产库，服务商待确认 | comments 的 fly secrets | 评论、回复、页面阅读量 | 每周 `pg_dump` custom archive |
| Cloudflare R2 | 业务 bucket | urge 的 fly secrets、`_config.yml` 公共音频基址 | 上传图片、歌单 / 播客音频 | 镜像到独立私有 backup bucket |
| Cloudflare Web Analytics | token `707b…715`（公开 site tag） | `default.html`、两个独立首页 | 全站访客 / 来源 / 设备统计 | 作为主流量口径；后台查询另需 API token |
| Google Cloud | OAuth client + GA4 `G-L6TCM0XFJ9` | Google 控制台、首页 HTML | Google 登录；GA4 仅两个首页 | OAuth 是登录单点；GA4 作为历史 / 辅助口径 |
| DeepSeek | API key | urge fly secret | 锆石小助手生成式回答 | 无 key 时应降级到站内检索 |
| 域名注册商 | `ruizhou03.com` | 注册商待确认 | 域名解析与续费 | 必须补登记账号、续费日、恢复邮箱 |
| 原作者 Mac | LaunchAgents / Keychain | `scripts/*.plist.template` | 邮件总结、机票监控、部分巡检 | 换机要重装；本机不是唯一数据副本 |

## 密钥名称与存放位置

### `zircon-urge` fly secrets

- 信任根：`AUTH_JWT_SECRET`、`POINTS_SECRET`、`CRON_SECRET`
- 管理：`ADMIN_EMAILS`、`GITHUB_TOKEN`、`GITHUB_REPO`、`GITHUB_BRANCH`
- 登录：`GOOGLE_CLIENT_ID`
- Redis：`UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`
- R2：`R2_ENDPOINT`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`、`R2_PUBLIC_BASE`
- 分析与 AI：`CF_ACCOUNT_ID`、`CF_API_TOKEN`、`CF_SITE_TAG`、`DEEPSEEK_API_KEY`
- 付费 / 兑换（当前暂停）：`PAYWALL_ADMIN_SECRET`、`AFDIAN_*`、`XUNHUPAY_*`、`PAY_PUBLIC_BASE`
- 其它运维：`RESET_SECRET`、`BYPASS_TOKEN`、AI 限额变量。

### `zircon-comments` fly secrets

- PostgreSQL：`POSTGRES_HOST`、`POSTGRES_PORT`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_DATABASE`、`POSTGRES_PREFIX`、`POSTGRES_SSL`
- 跨服务：`AUTH_JWT_SECRET`（必须与 urge 相同）、`POINTS_SECRET`（必须与 urge 相同）、`ADMIN_EMAILS`、`URGE_BASE`
- Waline 来源限制若启用：`SECURE_DOMAINS`。

### 主仓库 GitHub Actions secrets

- 每日指标：`CRON_SECRET`
- 每周备份：`UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`、`POSTGRES_*`、`R2_ENDPOINT`、`R2_SOURCE_BUCKET`、`R2_BACKUP_BUCKET`、`R2_SOURCE_ACCESS_KEY_ID`、`R2_SOURCE_SECRET_ACCESS_KEY`、`R2_BACKUP_ACCESS_KEY_ID`、`R2_BACKUP_SECRET_ACCESS_KEY`、`BACKUP_ENCRYPTION_PASSPHRASE`
- R2 备份使用两套专用 token：`zircon-podcast` 只读，`zircon-backups` 读写；不要复用 urge 上传服务的 token。
- 备份加密口令必须另存站主密码管理器 / macOS Keychain，不能只存在 GitHub，因为 Actions secret 无法读回。

## 每月核对

```bash
gh auth status
gh secret list --repo ruizhou03/ruizhou03.github.io --app actions
flyctl auth whoami
flyctl secrets list -a zircon-urge
flyctl secrets list -a zircon-comments
git -C backends/urge status --short --branch
git -C backends/comments status --short --branch
```

只检查名称、更新时间和仓库同步状态，终端与文档都不要打印密钥值。

## 尚待人工补齐

- 域名注册商、续费日、恢复邮箱。
- PostgreSQL 的实际服务商、套餐、快照能力与恢复入口。
- Cloudflare / Upstash / fly.io 的账单账号与第二管理员。
- 是否还需要部署 `zircon-mcp`；当前 fly 账号下没有同名 app。
- 第一次真实恢复演练日期；自动备份首次成功日期为 2026-07-20。
