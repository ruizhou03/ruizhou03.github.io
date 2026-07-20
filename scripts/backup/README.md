# 站点数据备份与恢复

## 覆盖范围

每周工作流 `.github/workflows/weekly-data-backup.yml` 做三件事：

1. 把 Upstash Redis 逻辑导出为 `upstash.json.gz`；
2. 用 PostgreSQL 17 的 `pg_dump --format=custom` 导出 Waline 评论库；
3. 把业务 R2 bucket 增量镜像到独立、私有的备份 bucket。

Redis 与 PostgreSQL 文件会连同校验清单打包，经 GnuPG AES-256 对称加密后才上传。工作流会从 R2 下载一遍密文并核对 SHA-256；PostgreSQL dump 在上传前用 `pg_restore --list` 验证。备份 bucket 不启用 public access，也不能与业务 bucket 相同。

首次生产验证于 2026-07-20 完成；当前权威成功运行是 GitHub Actions run `29716665551`：Redis 快照前后 key 数一致，PostgreSQL custom dump 可由 `pg_restore --list` 读取，R2 的 151 个对象全部匹配，密文上传后下载回读 SHA-256 一致。

同日完成第一次完整恢复演练：从 R2 取回最新密文，用 macOS Keychain 中的独立口令解密并重新核对 manifest 与 SHA-256；把 Redis 507 个 key 真实恢复到临时 Redis（hash 343、list 2、set 18、string 101、zset 43），再次写入非空目标时保护逻辑正确拒绝；把 Waline dump 真实导入临时 PostgreSQL 17，核对 `wl_comment` 49、`wl_counter` 339、`wl_users` 1、`playing_with_neon` 20，共 4 张 public 表；再把 R2 镜像经本机下载 / 上传恢复到独立临时桶，151 个对象、889,720,768 字节、逐对象检查 0 差异。演练产生的明文、临时数据库、临时桶与本机临时凭据随后全部销毁。

## GitHub Actions secrets

工作流需要：

- `UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`
- `POSTGRES_HOST`、`POSTGRES_PORT`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_DATABASE`
- `R2_ENDPOINT`
- 业务桶只读：`R2_SOURCE_ACCESS_KEY_ID`、`R2_SOURCE_SECRET_ACCESS_KEY`
- 备份桶读写：`R2_BACKUP_ACCESS_KEY_ID`、`R2_BACKUP_SECRET_ACCESS_KEY`
- `R2_SOURCE_BUCKET`、`R2_BACKUP_BUCKET`
- `BACKUP_ENCRYPTION_PASSPHRASE`

两个 R2 token 必须分开：源 token 只允许读取 `zircon-podcast`，目标 token 只允许读写 `zircon-backups`。工作流用两个独立的 rclone remote 做增量复制，不向业务桶写入，也不使用删除同步。备份 bucket 默认私有。加密口令必须同时保存在站主密码管理器或 macOS Keychain；只放 GitHub Actions secret 无法在灾难后取回。

## 取回与解密

```bash
aws s3 cp \
  "s3://$R2_BACKUP_BUCKET/site-backups/2026/07/<backup>.tar.gz.gpg" . \
  --endpoint-url "$R2_ENDPOINT"

gpg --decrypt --output backup.tar.gz <backup>.tar.gz.gpg
mkdir recovered && tar -xzf backup.tar.gz -C recovered
python3 scripts/backup/upstash_snapshot.py validate recovered/upstash.json.gz
scripts/backup/restore_postgres.sh --list recovered/waline.dump
```

先检查 `manifest.json` 和两个只读验证命令，再执行恢复。

## Redis 恢复

不带 `--apply` 只校验并显示摘要：

```bash
python3 scripts/backup/upstash_snapshot.py restore recovered/upstash.json.gz
```

空数据库恢复：

```bash
python3 scripts/backup/upstash_snapshot.py restore recovered/upstash.json.gz \
  --apply --confirm RESTORE_UPSTASH
```

目标已有数据时脚本默认拒绝。只有确认目标正确后才可再加 `--allow-overwrite`；它会按 key 覆盖同名数据。

## PostgreSQL 恢复

`--apply` 会对目标库使用 `pg_restore --clean --if-exists`，属于破坏性操作：

```bash
export CONFIRM_POSTGRES_RESTORE=RESTORE_WALINE
scripts/backup/restore_postgres.sh --apply recovered/waline.dump
```

执行前必须再次核对 `POSTGRES_HOST` 与 `POSTGRES_DATABASE`，优先先恢复到临时库演练。

## R2 恢复

默认只显示将要恢复的对象，不删除目标中的任何东西：

```bash
scripts/backup/restore_r2.sh --dry-run
export CONFIRM_R2_RESTORE=RESTORE_R2
scripts/backup/restore_r2.sh --apply
```

## 恢复演练

至少每季度做一次：新建临时 Redis / PostgreSQL / R2 bucket，恢复最新备份，核对 key 数、Waline 表与对象数，再销毁临时资源。自动工作流的下载回读和格式校验不能替代真实恢复演练。首次完整演练为 2026-07-20，下一次最迟 2026-10-20；演练用 Cloudflare token 也必须在控制台撤销。
