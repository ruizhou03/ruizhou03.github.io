# 播客流水线

把博客文章做成「周睿本人 AI 语音」的有声版。只针对随笔漫谈、非技术的生活攻略
等适合纯听的文章；学习资料、科研妙招这类工具性、带公式的不做。

## 数据流

```
文章 .md  ──①改写──▶  audio/scripts/<slug>.md  ──②synth.py──▶  audio/out/<slug>.mp3
                                                                      │
文章 front-matter 加 podcast: true  ◀──④回填──  ③upload.sh 上传到 R2 ──┘
```

- ① 改写：把文章改成「纯听也跟得上」的播客稿（去图片、加开场白结尾、英文术语补中文等）
- ② 合成：`synth.py` 用本地 CosyVoice 2 零样本克隆周睿的声音
- ③ 上传：`upload.sh` 把 mp3 推到 Cloudflare R2
- ④ 回填：给文章 front-matter 加 `podcast: true`，`post.html` 检测到就渲染播放器

## 目录约定

| 路径 | 进 git？ | 说明 |
|---|---|---|
| `audio/scripts/<slug>.md` | ✅ | 播客稿，可留档、可作 agent 产出物 |
| `audio/out/<slug>.mp3`    | ❌ | 生成的音频，走 R2，已 gitignore |
| `audio/ref/`              | ❌ | 参考音，已 gitignore |
| `scripts/podcast/config.sh` | ❌ | 本机配置（路径/密钥），已 gitignore |

`audio/` 整个目录在 `_config.yml` 里被 exclude，不进 Jekyll 构建。

## 一次性安装

```bash
bash scripts/podcast/install_cosyvoice.sh        # 装 CosyVoice 2 到 ~/cosyvoice-tts
cp scripts/podcast/config.example.sh scripts/podcast/config.sh   # 再按本机填好
```

## 录参考音

CosyVoice 零样本克隆需要一段固定的参考录音，反复复用。录音文本 + 要求见
[`voice/reference.md`](voice/reference.md)。录好的文件放 `~/cosyvoice-tts/ref/zircon-ref.wav`，
并把逐字转写填进 `config.sh` 的 `PODCAST_REF_TEXT`。

## Cloudflare R2 配置

1. Cloudflare 控制台 → R2 → 首次使用按提示开通（10GB 内免费）
2. 建 bucket，名字 `zircon-podcast`
3. bucket → Settings → Public access → 开 **R2.dev subdomain**，得到公共域名
   `https://pub-xxxxxxxx.r2.dev`（量大后可换绑自定义域名，r2.dev 有速率上限）
4. R2 → Manage R2 API Tokens → Create → 权限 **Object Read & Write**，限定到该 bucket；
   记下 Access Key ID / Secret Access Key / endpoint（形如
   `https://<accountid>.r2.cloudflarestorage.com`）
5. 本机配置 rclone：
   ```bash
   brew install rclone
   rclone config
   #  n) 新建，名字填 r2
   #  Storage 选 s3 ;  provider 选 Cloudflare
   #  填 access_key_id / secret_access_key
   #  region 填 auto ;  endpoint 填上面的 r2.cloudflarestorage.com 地址
   ```
6. 把第 3 步的公共域名填进 `_config.yml` 的 `podcast_base`，形如
   `https://pub-xxxx.r2.dev/p`（`/p` 是 `R2_PREFIX`）

## 发一篇播客

```bash
scripts/podcast/publish.sh birthday-21 --try   # 先合成前 3 段试音，确认音色像不像
scripts/podcast/publish.sh birthday-21         # 满意后合成整篇并上传
```

然后给文章 front-matter 加 `podcast: true`，commit。
