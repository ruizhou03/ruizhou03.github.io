# 付费文章工具链（paywall）

给中文博客做“付费文章”的一套机制。**先跑通机制阶段**：解锁走兑换码，你在爱发电收钱后手动发码；
爱发电 webhook / 账号绑定是第二期、接口已预留。

## 一条铁律

**付费正文绝不进公开仓库、绝不进 Jekyll 构建产物。** 本站仓库是 PUBLIC 的——只要进了 git，
全世界都能从源码或 git 历史读到。所以纯前端“藏后半段”等于没锁。真正的锁：付费正文只存在后端
Upstash，验证读者凭证后才下发。

## 组成

| 部分 | 位置 | 作用 |
|---|---|---|
| 全文源 | `_paid/*.md`（**已 gitignore**，永不提交/发布） | 你写付费文章全文的地方 |
| 构建脚本 | `scripts/paywall/build_paid.py` | 劈分预览/锁定，写预览文件 + 上传锁定正文 |
| 发码脚本 | `scripts/paywall/gen_codes.py` | 收钱后发兑换码 |
| 后端 | `backends/urge/api/paid.js`、`api/redeem.js`、`api/afdian-webhook.js`、`lib/paywall.js` | 存正文、发码、验证、下发、账号绑定、爱发电回调 |
| 前端 | `_includes/paywall.html`、`assets/js/paywall/paywall.js` | 付费墙卡片 + 输码解锁 + 注入正文 |

## 凭证模型（账号无关 + 可选账号绑定）

兑换码兑换后，后端给读者发一个随机 **unlock token**，存读者浏览器 localStorage，就是凭证。
不需要登录。一个 token 上可累加多篇买断 + 会员到期日。

**登录读者自动跨设备漫游（已实现）**：若读者用站点账号（SiteAuth）登录，购买/解锁时前端会带上
`Authorization: Bearer <jwt>`，后端把权益收敛到该账号的一条“规范 token”并记 `paid:acct:{accountId}`。
换设备、清缓存后只要再登录，`status`/`content` 会凭 accountId 取回权益——无需重新输码。匿名读者
完全不受影响（没 accountId 就走纯 token）。先匿名解锁、之后才登录的，下次打开付费页会自动把本地
token 认领（`bind`）进账号。

后端 Upstash key：
```
paid:content:{slug}  → { body, format, title }   锁定正文（markdown）
paid:meta:{slug}     → { price, memberPrice, afdianUrl }
code:{code}          → { grant, max, used, note }  兑换码
unlock:{token}       → { slugs:[...], memberUntil, accountId? } 读者凭证（存 2 年）
paid:acct:{accountId}→ { token }                  账号 → 规范 token（登录漫游用）
afdian:done:{order}  → '1'                         webhook 幂等标记
afdian:order:{order} → { code, grant }            webhook 自动铸的码（备查）
```

## 一次性部署点火（只做一次）

后端 = 现有 fly app `zircon-urge`，新增了 paid / redeem / afdian-webhook 三个路由。

```bash
# 1) 设两个 fly secret（管理密钥自己随便定一个长随机串）
cd backends/urge
fly secrets set PAYWALL_ADMIN_SECRET="$(openssl rand -hex 24)"
#   AUTH_JWT_SECRET / UPSTASH_* 等其它 secret 沿用现有，无需改

# 2) 把 PAYWALL_ADMIN_SECRET 也存到本机（构建/发码脚本要用，跟 fly 上一致）
echo 'export PAYWALL_ADMIN_SECRET=刚才那个串' >> ~/.zshrc && source ~/.zshrc

# 3) 部署后端（注意：server.js 已加 paid/redeem 路由）
fly deploy
```

> ⚠️ 与账号系统 WIP 的交叉点：`backends/urge/server.js` 同时含未提交的 auth/me 路由（另一会话在做）
> 和本功能的 paid/redeem 路由。提交 urge 仓库时按各自归属分开提交，别混。

## 发一篇付费文章的日常流程

```bash
# 1) 在 _paid/ 写全文，正文里用一行 <!-- PAYWALL --> 分隔免费预览和锁定正文。
#    front-matter 必须有 paid:true 和 paid_public:（预览写到仓库哪个路径）。
#    见 _paid/_TEMPLATE.md 模板。

# 2) 构建：写公开预览文件 + 上传锁定正文
python3 scripts/paywall/build_paid.py _paid/my-article.md
#   想先看劈分对不对、不上传：加 --dry-run

# 3) 提交并发布预览（只 add 预览文件，别 add _paid/）
git add <预览文件路径>
git commit -m "feat: 付费文章 xxx 上线预览" && git push

# 4) 收到钱后发码（爱发电后台看到付款 → 发码）
python3 scripts/paywall/gen_codes.py article --slug my-slug --count 1
#   会员码：python3 scripts/paywall/gen_codes.py member --days 30
```

读者：打开文章 → 看到预览 + 付费墙卡片 → 去爱发电付款 → 收到你发的码 → 输码 → 全文展开。

## 锁定正文的写法限制

锁定部分用 **标准 markdown**（前端 marked.js 渲染）：
- ✅ 段落、标题、**粗体**、列表、链接、引用、代码块
- ✅ 内嵌 HTML：`<p class="img-caption">…</p>`、`<img>` 等原样透传
- ✅ `$...$` / `$$...$$` 数学（页面已加载 KaTeX，注入后自动渲染）
- ❌ Liquid 标签 `{% … %}` / `{{ … }}`、kramdown 行内属性 `{:.class}`（marked 不认）

## 站内扫码收银（虎皮椒，现在的主路）

读者点档位（单篇/整栏/会员）→ 站内弹收银浮层扫码 → 付完**自动解锁**、无需手输码。
后端 `api/pay.js` + 适配层 `lib/pay-xunhupay.js`，钱走聚合支付**虎皮椒**（个人实名即可、免营业执照）。

流程：`create` 建单拿扫码（金额一律由后端按 `paid:meta:{slug}` 决定，不信前端）→ 前端每 1.5s 轮询
`status`（pending 时后端顺手主动查单兜底）→ 虎皮椒 `notify` 回调 / 查单任一确认到账 → 后端把权益记到
读者 token（登录则绑账号）→ 浮层收起、正文当场展开。付款绑在 token 上，关了页面重开仍是解锁态。

**配置（fly secret）**：
```bash
cd backends/urge
fly secrets set XUNHUPAY_APPID="虎皮椒后台的 appid"
fly secrets set XUNHUPAY_APPSECRET="虎皮椒后台的 appsecret"
# notify/return 地址后端自动拼（PAY_PUBLIC_BASE 默认 https://zircon-urge.fly.dev，换域名再设）
```
虎皮椒后台「回调通知地址」填：`https://zircon-urge.fly.dev/api/pay?action=notify`

> **没配 key 时自动走 mock 支付源**：`create` 返回一个“点我模拟支付”链接（`?action=devpay`），
> 整条 UX（选档→浮层→付款→自动解锁）照样能端到端联调，不碰真钱。配上真 key 后 devpay 自动失效。
> ⚠️ `lib/pay-xunhupay.js` 的字段名/签名按虎皮椒文档实现，拿到真 key 后请用一笔真实小额订单核对一遍。

## 兑换码 / 卡密（备用：礼品、补发、或不接聚合时）

### 路 A：爱发电「卡密自动发货」（最省事，零代码）
1. `gen_codes.py article --slug xxx --count 50` 先批量铸 50 张码（打印出来）。
2. 爱发电后台给该商品开「自动发货 → 卡密」，把这 50 行码粘进库存。
3. 买家付款后爱发电自动吐一张码给他，他在文章里输码解锁。卖完了再补铸补库存。

### 路 B：webhook 自动处理（`/api/afdian-webhook`，已实现）
爱发电后台「开发者 → Webhook」填回调地址：`https://zircon-urge.fly.dev/api/afdian-webhook?key=<你的KEY>`。
收到订单后后端会：核实订单 → 按 plan 映射出权益 → 铸码存档（或按备注直接解锁）。配置（fly secret）：

```bash
cd backends/urge
fly secrets set AFDIAN_WEBHOOK_KEY="$(openssl rand -hex 12)"          # 回调地址 ?key= 防乱探
fly secrets set AFDIAN_USER_ID="你的爱发电 user_id"                    # 选填：配上才会反查核实订单
fly secrets set AFDIAN_TOKEN="你的爱发电 token"                        # 选填：同上（强烈建议）
# plan_id → 权益映射（爱发电每个"方案/商品"一个 plan_id）：
fly secrets set AFDIAN_PLAN_MAP='{"plan_abc":{"kind":"member","days":30},"plan_xyz":{"kind":"article","slug":"my-slug"}}'
```

- 会员按订单月数成倍顺延（买 3 个月 → `days*3`）。
- 买家若在爱发电**留言**里写 `t_xxxx`（自己的 unlock token）→ 直接解锁，免兑换码；写 `slug:my-article`
  也能指定单篇。认不出买什么的订单存进 `afdian:unmapped:{order}` 等人工。
- 幂等：同一订单重复推送只处理一次。
- 推荐：路 A 做交付主力，路 B 兜底 + 做核实/对账。

## 还没做（更后面）

- 游戏/工具内购：同一套 token + `/api/paid?action=status` 查权益，门控高级特性。
- 爱发电订单 → 自动把码邮件/站内信推给买家（目前靠卡密自动发货代偿）。
