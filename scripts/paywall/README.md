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
| 后端 | `backends/urge/api/paid.js`、`api/redeem.js`、`lib/paywall.js` | 存正文、发码、验证、下发 |
| 前端 | `_includes/paywall.html`、`assets/js/paywall/paywall.js` | 付费墙卡片 + 输码解锁 + 注入正文 |

## 凭证模型（账号无关）

兑换码兑换后，后端给读者发一个随机 **unlock token**，存读者浏览器 localStorage，就是凭证。
不需要登录。一个 token 上可累加多篇买断 + 会员到期日。将来站点账号系统落地后，可把 token
绑到 accountId 让解锁跨设备漫游（第二期，无需重做）。

后端 Upstash key：
```
paid:content:{slug}  → { body, format, title }   锁定正文（markdown）
paid:meta:{slug}     → { price, memberPrice, afdianUrl }
code:{code}          → { grant, max, used, note }  兑换码
unlock:{token}       → { slugs:[...], memberUntil } 读者凭证（存 2 年）
```

## 一次性部署点火（只做一次）

后端 = 现有 fly app `zircon-urge`，新增了 paid/redeem 两个路由。

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

## 第二期（已预留、暂不做）

- 爱发电 webhook：`/api/afdian-webhook` 收到订单 → 自动发码/直接解锁，免手动。
- 账号绑定：登录后把 unlock token 挂到 accountId，跨设备漫游。
- 游戏/工具内购：同一套 token + `/api/paid?action=status` 查权益，门控高级特性。
