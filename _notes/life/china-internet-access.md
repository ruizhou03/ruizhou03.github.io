---
layout: post
title: "为什么有的外国网站中国大陆能访问，有的不能？而 AI 服务为什么大多都不行？"
date: 2026-05-25
main_category: "生活攻略"
sub_category: "生活之问"
permalink: "/life/china-internet-access"
keywords: ["外国网站打不开", "外网中国大陆访问", "为什么 Google 上不了", "为什么 Twitter 上不了", "为什么 ChatGPT 不能用", "ChatGPT 中国不能用", "Claude 中国大陆", "Gemini 中国", "AI 网站 中国 屏蔽", "GFW 防火长城", "Great Firewall", "DNS 污染", "DNS 投毒", "IP 黑洞", "TCP RST 注入", "SNI 阻断", "TLS 握手 拦截", "深度包检测 DPI", "geo-blocking 地理屏蔽", "国别屏蔽 IP", "OpenAI 屏蔽中国", "OpenAI 不支持中国", "出口管制 AI", "BIS 出口管制", "生成式人工智能服务管理办法", "AI 监管 中国", "PIPL 个人信息保护法", "数据出境", "Bing 中国能用", "GitHub 中国能上", "维基百科 中国 屏蔽", "为什么 Wikipedia 上不了", "Country region not supported"]
---

# 1. 问题

每个用过中国大陆互联网的人都遇到过这样的事：

- Google、Twitter、Facebook、YouTube——加载了几秒，转圈，然后超时
- 维基百科——中文版有时能上、有时打不开
- GitHub——能上，但有时 LFS 下载、Pages 站点会断
- Bing——能上，且首页搜索结果跟海外版有所不同
- ChatGPT、Claude、Gemini——直接给一个英文提示：“Country, region, or territory not supported”

明明都是“外国网站”，待遇却完全不同——有的彻底被挡在门外，有的能进但慢，有的进得去但少几个功能。而**几乎所有 AI 服务**都打不开，看上去比新闻类网站封得还彻底。

这是什么原因？是中国“墙”全包了，还是这些外国公司自己也在屏蔽中国大陆用户？这篇想把背后的两种技术机制讲清楚——你下次再看到一个外国网站打不开，就能大致判断“是哪一边在拦你”。

# 2. 结论先行

- **网站“打不开”，可能是两边各自动手——也可能两边同时动手**。访问一个境外网站要走 DNS、TCP、TLS、HTTP 四步，任何一步都能被拦下；具体哪一步出问题，决定了你看到的报错长什么样。
- **中国侧的封锁（俗称“墙”/GFW）主要靠五种技术手段**：DNS 污染、IP 黑洞、TCP RST 注入、SNI 阻断、深度包检测（DPI）。这些技术对**特定域名/IP**生效，并不是“全部外网”——所以同样是境外站点，有的能上、有的上不了，差别在它的域名/IP 是否被列入了拦截规则。
- **国外侧的屏蔽（geo-blocking）则是公司自己决定不向中国 IP 提供服务**。它通过 IP 地理位置数据库判断你来自哪个国家，然后在自己服务器一侧拒绝或重定向。**绝大多数主流 AI 服务（OpenAI、Anthropic、Google Gemini）属于这种**——你看到的是它们自己返回的“地区不支持”提示，不是连接被拦截。
- **为什么 AI 服务这么“团结”地不向中国大陆开放**？三个主要原因叠加：
  1. **美国出口管制**：BIS 对“先进 AI 模型与训练能力”的出口管制规则收紧（特别是 2024 年起），公司主动卡掉受限地区以规避合规风险；
  2. **中国本土监管**：《生成式人工智能服务管理暂行办法》（2023.08 起施行）要求向中国境内用户提供生成式 AI 服务的公司在 CAC（国家网信办）做算法备案、内容审核——海外公司基本没法满足；
  3. **支付与风控**：中国大陆 IP 历史上信用卡欺诈率高、且很多用户用礼品卡/代充注册，AI 服务公司也不愿意吃这部分账。
- **判别拦截来自哪一边的简便方法**：用海外 IP 直连访问，如果能正常打开 → 是中国侧拦截；如果用海外 IP 也得到“region not supported” → 是公司侧 geo-blocking。

下面把每一种技术机制讲透。

# 3. 科学原理

## 3.1 你访问一个网站的四个步骤

要理解“哪一步被卡了”，先看一次正常 HTTPS 访问要走哪几步：

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 220" style="max-width:100%;height:auto;display:block;margin:1.4em auto;">
  <text x="360" y="22" text-anchor="middle" font-size="14" fill="#333" font-weight="600">一次访问 https://example.com 的四步</text>
  <g font-size="11" text-anchor="middle">
    <!-- Step 1 -->
    <rect x="30" y="50" width="140" height="100" rx="8" fill="#cfe3f5" stroke="#2b6cb0"/>
    <text x="100" y="73" font-weight="600" fill="#2b6cb0">① DNS</text>
    <text x="100" y="93" fill="#444">域名 → IP</text>
    <text x="100" y="113" fill="#888" font-size="10">问"example.com 在哪"</text>
    <text x="100" y="130" fill="#888" font-size="10">得到 "93.184.216.34"</text>

    <!-- Step 2 -->
    <rect x="200" y="50" width="140" height="100" rx="8" fill="#fef5e6" stroke="#e57f00"/>
    <text x="270" y="73" font-weight="600" fill="#e57f00">② TCP</text>
    <text x="270" y="93" fill="#444">和 IP 建立连接</text>
    <text x="270" y="113" fill="#888" font-size="10">三次握手</text>
    <text x="270" y="130" fill="#888" font-size="10">SYN / SYN-ACK / ACK</text>

    <!-- Step 3 -->
    <rect x="370" y="50" width="140" height="100" rx="8" fill="#e6f5e6" stroke="#2e8b57"/>
    <text x="440" y="73" font-weight="600" fill="#2e8b57">③ TLS 握手</text>
    <text x="440" y="93" fill="#444">证明对方是它</text>
    <text x="440" y="113" fill="#888" font-size="10">ClientHello（含 SNI）</text>
    <text x="440" y="130" fill="#888" font-size="10">证书校验、加密协商</text>

    <!-- Step 4 -->
    <rect x="540" y="50" width="140" height="100" rx="8" fill="#f5e1f0" stroke="#b83280"/>
    <text x="610" y="73" font-weight="600" fill="#b83280">④ HTTP 请求</text>
    <text x="610" y="93" fill="#444">真正取数据</text>
    <text x="610" y="113" fill="#888" font-size="10">GET / Host: example.com</text>
    <text x="610" y="130" fill="#888" font-size="10">服务器返回 HTML</text>
  </g>
  <line x1="170" y1="100" x2="200" y2="100" stroke="#888" stroke-width="2" marker-end="url(#a3)"/>
  <line x1="340" y1="100" x2="370" y2="100" stroke="#888" stroke-width="2" marker-end="url(#a3)"/>
  <line x1="510" y1="100" x2="540" y2="100" stroke="#888" stroke-width="2" marker-end="url(#a3)"/>
  <text x="360" y="185" text-anchor="middle" font-size="11" fill="#c0504d" font-weight="600">任何一步被卡住，"访问"就失败。中国侧 / 国外侧拦截走的是不同的步骤。</text>
  <defs>
    <marker id="a3" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="#888"/>
    </marker>
  </defs>
</svg>
<p class="img-caption">关键认知：访问网站不是一个原子动作，而是由 DNS、TCP、TLS、HTTP 四个独立环节串联起来的过程。下面看到的每一种"被墙"技术，本质上都是在某一步插一刀。</p>

## 3.2 中国侧封锁的五种技术手段

防火长城（Great Firewall，GFW）并不是一台“开关机器”，而是一套部署在国际出口骨干网上的过滤系统，五种机制并行：

### ① DNS 污染（DNS 投毒）

**目标：第 1 步**——把“域名查 IP”这一步搞坏。

DNS 查询走的是 UDP 协议（无连接、无校验），任何能看到你流量的中间人都能伪造一个响应。GFW 监听经过国际出口的 DNS 请求，发现是被列入黑名单的域名（比如 `twitter.com`），就**抢在真正 DNS 服务器返回之前**，伪造一个“指向无关 IP”（甚至完全随机的私网地址）的应答塞给你的电脑。

效果：你的浏览器拿到了一个错的 IP，连过去要么连不上、要么连到一个无关的网页。**这是封锁外网最便宜、最高效的一招**，因为不需要拦截每一个数据包，只需要在你“问路”那一刻骗你一次。

绕过这一招的常见尝试：用 `8.8.8.8`（Google DNS）或 `1.1.1.1`（Cloudflare DNS）。但 GFW 本来就在拦截 UDP/53 端口的所有响应——**用谁的 DNS 都一样会被污染**。真正能绕过的方法是 DNS over HTTPS / DNS over TLS（DoH/DoT），把 DNS 查询藏在 HTTPS 里——这是为什么近年 GFW 也在加大对 DoH/DoT 的识别和阻断。

### ② IP 黑洞 / 路由级阻断

**目标：第 2 步**——你拿到了正确 IP，但根本“连不上”。

这是路由层的封锁：对特定 IP 段（比如 Facebook 自有 IP 段、Twitter 自有 IP 段），GFW 让国际出口路由器直接**丢弃发往这个 IP 的所有数据包**。你的 TCP SYN 包发出去，永远收不到 SYN-ACK——浏览器卡 30 秒后报“超时”。

特点：精准、稳定，且**不会有“被拦截”的提示**，看起来就像对方网站宕机。这一招在封锁基础设施大、IP 范围明确的服务（Facebook、Twitter、X、Telegram 等）时被广泛使用。

### ③ TCP RST 注入

**目标：第 2-4 步任意位置**——连接建立后，半路给你一巴掌。

GFW 的另一个核心机制：**伪造一个 TCP RST 包**（连接重置）塞回给你和对方，让双方都误以为对面想关闭连接。这个伪造包的源 IP、端口、序列号都和真正的连接一致，操作系统无法区分。

这一招的特点是：**它不阻止前面的连接，而是在监测到某个“敏感关键词”或“敏感 SNI”之后才出手**。所以你常常能看到：“访问刚开始有响应，但过了几秒突然连接被重置（ERR_CONNECTION_RESET）”——这就是 RST 注入在干活。

### ④ SNI 阻断

**目标：第 3 步**——TLS 握手刚开始时拦截。

HTTPS 时代 DNS 污染的效果在下降（因为可以走 DoH），但 GFW 找到了一个新弱点：**TLS 握手的 ClientHello 包里，SNI（Server Name Indication）字段是明文的**，里面写着你要访问的域名（比如 `example.com`）。

为什么 SNI 是明文？早期 TLS 设计时，需要让一台服务器（一个 IP）能托管多个域名的 HTTPS 网站，服务器必须在握手之初就知道“客户端要访问哪个域名”，所以 SNI 没法加密。

GFW 实时扫描所有 TLS ClientHello 包里的 SNI 字段，发现命中黑名单，立刻发 TCP RST 把连接打断。**这一招杀伤范围极广**——几乎所有现代被封锁的网站，最后一道防线都是 SNI 阻断。

绕过 SNI 检测的技术叫 **ECH（Encrypted Client Hello）**，把 SNI 也加密。但 GFW 已经开始识别和阻断 ECH 流量。

### ⑤ 深度包检测（DPI）

**目标：第 4 步及全程**——对加密流量按“行为指纹”识别。

如果你用 VPN、Shadowsocks、Trojan、WireGuard 等加密代理协议，前 4 步全部走代理服务器、内容全加密——GFW 看不到内容。但 DPI 仍能从**包大小、包频率、握手特征**识别“这是某种代理协议”。

近几年的特征：

- **OpenVPN、IPsec、PPTP**：被识别得最早、最彻底，几乎不再可用
- **WireGuard**：被识别，多数地区基本被封
- **Shadowsocks、V2Ray、Trojan、Xray**：还在和 GFW 持续猫鼠游戏；新协议（Reality、Hysteria2）的核心思路就是“假装成普通 HTTPS 流量”以躲避 DPI 指纹识别

## 3.3 国外侧的屏蔽：geo-blocking

这是与 GFW 完全独立的另一套机制——**外国公司主动拒绝向中国大陆 IP 提供服务**。技术上很简单：

1. 服务器收到你的请求时，看你的 IP 地址
2. 用 IP 地理数据库（MaxMind、IP2Location 等）查这个 IP 属于哪个国家
3. 如果在公司黑名单（比如 `CN`, `HK`, `MO`, `IR`, `RU`, `KP`），直接返回错误或重定向

特征报错：

- OpenAI（ChatGPT）：`Country, region, or territory not supported`
- Anthropic（Claude）：返回拒绝访问页面
- Google Gemini：`Gemini isn't currently supported in your country`
- Netflix（中国大陆）：`Netflix isn't available in your region`
- 部分美国银行、券商网站：拒绝来自中国的注册和登录

判别要点：**这种屏蔽给出的报错是“明确的、可读的”**——你能看到“地区不支持”的提示，连接是通的，是对方网站主动拒绝。这就是和 GFW（“连不上 / 超时 / 重置”）最大的区别。

## 3.4 为什么 AI 服务几乎“集体不开放”中国大陆

这是国外侧屏蔽里最显著的一个类别。三条原因叠加：

### ① 美国出口管制

2022 年开始，美国 BIS（工业与安全局）不断扩展对中国的高科技出口管制清单。2024 年明确把“先进 AI 模型与训练能力”作为关注对象——核心思路：**防止先进 AI 能力被用于军事、情报、监控用途**。OpenAI 在 2024 年 7 月正式断掉中国大陆和港澳的 API 访问，并明确给出“地区不在支持名单”的理由。

虽然法律上 ChatGPT 这种**消费级聊天产品**是否在出口管制范围内仍有争议，但**公司选择“宁可宽限止于本国合规、不进灰色地带”是更稳妥的策略**——尤其是几大头部 AI 公司都背着美国政府合同/补助/安全审查。

### ② 中国的生成式 AI 监管

2023 年 8 月，《生成式人工智能服务管理暂行办法》正式施行，要求：

- **算法备案**：向中国境内用户提供生成式 AI 服务的提供者，必须在国家网信办做算法备案
- **内容安全审查**：训练数据、输出内容都需符合“社会主义核心价值观”，建立内容审核与举报机制
- **数据合规**：训练数据涉及个人信息的，需符合 PIPL；境内用户数据须本地存储
- **实名制**：用户需实名注册，提供者保留日志至少 6 个月

对海外 AI 公司而言，**满足以上要求几乎等于“在中国境内建立完整的合规实体、做完整的内容审核**”——成本高、政策风险大。绝大多数公司选择更省事的“地理屏蔽”。

### ③ 支付风控

这一条相对低调但真实：中国大陆地区的信用卡支付从国外公司视角看欺诈率偏高（盗卡、礼品卡转售、代充服务），且 AI 服务（按 token 消耗）容易被滥用。封掉地区 IP 是最简单粗暴的风控。

### 三方夹击的结果

哪怕只有一条原因，公司也可能选择不进入；三条叠加之下，**所有头部 AI 服务（OpenAI、Anthropic、Google Gemini、Mistral、Perplexity 等）都选择主动屏蔽中国大陆 IP**。

少数例外是有“中国版”或“本地合作版”的：

- **Microsoft Copilot**：Microsoft 通过中国合资公司（21Vianet/世纪互联）提供 Azure China，部分 AI 服务有合规版本
- **GPT-4 / Claude / Gemini 等模型的 API**：通过中国云厂商（阿里、华为、腾讯）的合作版本，性能、内容审核与海外版有差异
- **国产 AI**：DeepSeek、文心、通义、Kimi、智谱 GLM、Qwen 等已经做了完整的国内合规备案，是中国大陆用户的实际可用项

## 3.5 为什么有的网站完全能上、有的能上不能用全功能

这是上面所有机制共同作用的结果，可以看几个具体例子：

| 网站 | 是否能上 | 谁在拦 | 原因 |
|---|---|---|---|
| Google 搜索 | 不能 | 中国侧（GFW） | 2010 年退出大陆 + 域名被列入封锁名单 |
| Bing 搜索 | 能上 | / | 微软长期与中国合作，国内有合规版本 cn.bing.com |
| YouTube | 不能 | 中国侧（GFW） | 整站封锁 |
| Twitter / X | 不能 | 中国侧（GFW） | IP 黑洞 + SNI 阻断双重封锁 |
| GitHub | 能上 | / | 多次“擦边”被封后恢复；近年偶有 LFS / Pages 不稳 |
| Wikipedia 英文版 | 部分页面 | 中国侧（GFW） | 早期可上，2019 起全语言版 https 封锁，中文版长期不可用 |
| Stack Overflow | 能上 | / | 不在封锁名单 |
| ChatGPT / Claude / Gemini | 不能 | **国外侧 geo-blocking** | 美国出口管制 + 中国生成式 AI 监管 + 支付风控 |
| Netflix | 不能 | **国外侧 geo-blocking** | 没有中国大陆区版权 + 公司未在大陆运营 |
| Amazon.com 主站 | 部分功能不可用 | **国外侧** | 配送和 Prime 不覆盖大陆 |

判别小窍门：

- “连接超时” / “Connection Reset” / “DNS_PROBE_FINISHED_NXDOMAIN” → **中国侧拦截**
- “Sorry, this service is not available in your country” / “Country not supported” / 重定向到 `/unsupported` → **国外侧屏蔽**
- “能登录但部分功能不可用”（比如 GitHub LFS、Amazon 配送、Apple Music 部分内容）→ 通常是**国外侧的功能级地理限制**，不是网站被封

# 4. 实践建议

- **不要把“打不开”等同于“被中国封了”**。下次遇到打不开的网站，先看报错：是连不上（GFW），还是网页明确告诉你“地区不支持”（geo-blocking）。这两种本质不同，应对思路也不同。
- **AI 服务在大陆的合法可用路径**：
  - 国产合规 AI（DeepSeek、Kimi、文心、通义、智谱 GLM、Qwen 等）——效果接近、合规可用、支付方便
  - 通过云服务商提供的海外模型 API（Azure OpenAI Service 中国版、阿里云 / 华为云的合作模型）——合规接入，企业用户为主
  - 出差/留学期间用本地账号注册的海外 AI，本人在境外访问完全合规
- **个人面对 geo-blocking 时的合规做法**：
  - 留学/工作期间在所在地正常注册账号，回国前评估是否能继续使用
  - 公司提供合规海外接入通道的，用公司账号
  - 不要在大陆境内使用非合规渠道访问，**这部分内容已经超出“科普”范畴**——本文不展开讨论可能违反 PRC 网络相关法规的方法
- **理解技术机制对生活的实际价值**：
  - 看到外国朋友说“你怎么用不了 X”，能解释清楚是哪一边在拦
  - 选服务时知道哪些类别本来就不向中国大陆开放（比如绝大多数海外 SaaS、消费级 AI），别在不可用的服务上浪费时间
  - 海外旅行/出差时不被“国别不支持”卡住——很多服务在你回国后会自动判断 IP，需要换回海外 IP 才能继续用

# 5. 参考来源

1. **Knockel J, Crete-Nishihata M, Senft A, et al. (Citizen Lab).** *Measuring the Great Firewall's Multi-layered Web Filtering Apparatus.* University of Toronto. ——对 GFW 五层拦截（DNS、IP、TCP、TLS、HTTP）机制的系统测量综述。
2. **Anonymous (USENIX FOCI).** *Towards a Comprehensive Picture of the Great Firewall's DNS Censorship.* Free and Open Communications on the Internet, USENIX. ——DNS 污染的实证测量与机制分析。
3. **GFW Report (https://gfw.report/).** *Technical reports on Great Firewall mechanisms.* ——长期跟踪 GFW 技术演进的开源研究项目，包括 SNI、QUIC、ECH 阻断等最新动向。
4. **U.S. Department of Commerce, Bureau of Industry and Security (BIS).** *Export Administration Regulations (EAR) — Advanced Computing and Semiconductor Manufacturing Items.* 2022-2024 各版更新. ——美国对中国高性能 AI 训练硬件与软件的出口管制法规来源。
5. **国家互联网信息办公室.** *《生成式人工智能服务管理暂行办法》.* 2023 年 7 月公布，2023 年 8 月 15 日施行. ——中国对生成式 AI 服务的本土监管要求，海外公司未备案即无法合规向大陆提供服务的依据。
6. **OpenAI Help Center.** *Supported countries and territories.* https://platform.openai.com/docs/supported-countries. ——OpenAI 官方公布的支持地区列表与“中国大陆不在内”的官方依据。
7. **全国人民代表大会常务委员会.** *《中华人民共和国个人信息保护法》（PIPL）.* 2021 年 11 月 1 日施行. ——数据出境与本地化存储要求的法律基础。
8. **The Register.** *China upgrades Great Firewall to defeat TLS tools.* 2022. ——对 GFW 升级针对 TLS 类协议（Trojan、Shadowsocks）阻断能力的报道。
