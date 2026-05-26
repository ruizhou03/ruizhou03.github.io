---
layout: post
title: "美国报税完全指南（三）：跨阶段长期规划与进阶话题"
date: 2026-05-26
main_category: "生活攻略"
sub_category: "留学攻略"
permalink: "/life/us-tax-longterm-planning"
last_reviewed: 2026-05-26
keywords: ["美国报税长期规划", "留学生税务规划", "F-1 H-1B 报税", "OPT 报税", "绿卡 报税", "dual-status year", "dual status alien", "双身份年", "first-year choice", "spousal election", "6013(g)", "F-1 401k", "F-1 Roth IRA", "F-1 HSA", "NRA 401k", "NRA Roth IRA", "NRA broker", "Charles Schwab F-1", "Fidelity F-1 IRA", "RSU 报税", "ESPP 报税", "RSU cost basis", "wash sale", "tax loss harvesting", "backdoor Roth", "mega backdoor Roth", "FBAR", "FinCEN 114", "Form 8938", "FATCA", "Form 8833 treaty", "Form 8854", "exit tax", "expatriation tax", "EB-1 报税", "EB-2 NIW 报税", "FIRPTA", "卖房 预扣", "child tax credit ITIN", "Married Filing Jointly NRA", "MFJ NRA spouse", "treaty saving clause", "Article 20 grandfathered", "RA 第六年 报税", "PhD 找 CPA", "国际生 CPA 推荐", "1040X amended return", "Schedule B 海外", "Schedule D capital gains", "1099-B cost basis", "wash sale 30 days", "1042-S vs W-2", "OPT 转 H-1B 报税", "H-4 配偶 ITIN", "8843 J-2", "401k 取钱 NRA 预扣", "Roth conversion ladder", "留学生买房 报税"]
---

# 1. 这篇文章给谁看

写给**已经报过 1-2 年税、想做长期规划的留学生 / 早期职业者**：

- 我马上要从 F-1 第 5 年进入第 6 年——身份从 NRA 变 RA，**该提前做什么**？
- OPT 转 H-1B 同一年里，我**到底用 1040NR 还是 1040**？听说有个“dual-status year”——怎么报？
- 学校 / 公司给我 401(k) 雇主匹配——**F-1 NRA 能不能存**？要不要存？
- 我开始 vesting RSU / 参加 ESPP——**报税复杂在哪**？怎么不被双重征税？
- 国内还有几个银行账户加起来 $\sim 5\text{-}50$ 万——**FBAR / Form 8938** 到底要不要报？
- 配偶 / 父母 / 小孩——**婚姻 / 抚养 / 子女抵免**对税有多大影响？
- 我已经 H-1B 了，**啥时候该找 CPA、啥时候继续自己报**？

这是**美国报税三部曲的第三篇**。第一篇讲身份与术语（[报税基础](/life/us-tax-basics-for-students)），第二篇讲实战流程（[报税实战](/life/us-tax-filing-process)），第三篇专讲**跨阶段的长期规划 + 几个进阶话题**——填表细节不再重复，重点是**事件发生前的“安排”**和**事件之后的“补救”**。

> ⚠️ 本文涉及金额上限、税率、phase-out 阈值等**每年都会调整**的参数（IRS 每年 10-11 月公布次年数字）。文中数字以 **2026 年（即 2026 报 2025 税 / 2027 报 2026 税）**为基准，引用前**核对当年 IRS 官方**。复杂个案（dual-status、跨国婚姻、出租房、自雇）请咨询 CPA。

# 2. 结论先行

**全程税务身份时间线（典型中国 PhD / 工作族）**：

```
F-1 第 1-5 年（NRA）→ F-1 第 6 年起（RA）→ OPT/STEM OPT（身份不变）
→ H-1B 转换年（dual-status）→ H-1B（RA）→ 绿卡 → 公民
     ↑                       ↑                  ↑
  FICA 豁免/                Article 20 失效/    全球收入终身报/
  Article 20 生效            401k/Roth 全开     Exit Tax 风险
```

**6 个跨阶段“税务事件”**——发生前**至少提前 3 个月规划**：

| 事件 | 关键准备 | 不准备的后果 |
|---|---|---|
| **F-1 NRA → RA**（第 6 个日历年）| 检查 FICA 开始扣 / 开 Roth IRA / max 401k / 报 FBAR | 错失 RA 第一年 Roth 额度 |
| **OPT → H-1B**（双身份年）| 决定 dual-status vs full-year election | 多交税 $1\text{-}5K$ |
| **结婚**（与 USC / RA）| 决定 MFJ vs Separate / W-4 调整 | 退税延迟 / 补税 |
| **买房** | 提前年初 close → mortgage interest itemize | 错失第一年 deduction |
| **卖股票 / RSU vest** | 算 wash sale + 调整 cost basis | 双重征税 |
| **绿卡 / 公民**（含放弃绿卡）| 评估 exit tax 风险 | \$100K+$ 一次性补税 |

**4 件你必须知道的事**：

1. **NRA 第 6 年自动 RA**——不是你“申请”成 RA，是 IRS 自动判定。**财务规划要提前一年开始**
2. **Dual-status year 默认更复杂**——多数情况选 first-year choice / spousal election 反而省税
3. **F-1 NRA 不用报 FBAR**——但成 RA 当年开始就要报；多数留学生**第六年容易漏报** $\rightarrow$ 罚款 \$10K+$
4. **RSU / ESPP cost basis 必须自己调**——公司 1099-B 上的 cost basis 经常缺 ordinary income 部分，照抄就会双重征税

# 3. 全程税务身份时间线

下面是一个**典型中国 PhD 学生** $\rightarrow$ **入职** $\rightarrow$ **绿卡**的完整税务时间线。理解整张时间线，每个节点你才知道“现在要做什么、下个节点要做什么”。

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 480" style="max-width:100%;height:auto;display:block;margin:1.4em auto;">
  <text x="380" y="22" text-anchor="middle" font-size="14" fill="#333" font-weight="600">F-1 PhD → H-1B → 绿卡：税务身份与关键事件时间线</text>
  <defs>
    <marker id="ta" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="#888"/>
    </marker>
  </defs>
  <line x1="60" y1="80" x2="700" y2="80" stroke="#888" stroke-width="2" marker-end="url(#ta)"/>
  <g font-size="11" text-anchor="middle">
    <circle cx="100" cy="80" r="5" fill="#2b6cb0"/>
    <text x="100" y="68" fill="#2b6cb0" font-weight="600">第 1-5 年</text>
    <text x="100" y="100" fill="#555">F-1 NRA</text>
    <circle cx="240" cy="80" r="5" fill="#e57f00"/>
    <text x="240" y="68" fill="#e57f00" font-weight="600">第 6 年</text>
    <text x="240" y="100" fill="#555">F-1 RA</text>
    <circle cx="380" cy="80" r="5" fill="#2e8b57"/>
    <text x="380" y="68" fill="#2e8b57" font-weight="600">OPT → H-1B</text>
    <text x="380" y="100" fill="#555">dual-status</text>
    <circle cx="520" cy="80" r="5" fill="#b83280"/>
    <text x="520" y="68" fill="#b83280" font-weight="600">H-1B</text>
    <text x="520" y="100" fill="#555">RA / 全球收入</text>
    <circle cx="660" cy="80" r="5" fill="#666"/>
    <text x="660" y="68" fill="#666" font-weight="600">绿卡</text>
    <text x="660" y="100" fill="#555">终身全球收入</text>
  </g>
  <g font-size="10">
    <rect x="20" y="140" width="160" height="280" rx="6" fill="#eaf2fa" stroke="#2b6cb0"/>
    <text x="100" y="158" text-anchor="middle" font-weight="600" fill="#2b6cb0">F-1 NRA（1-5 年）</text>
    <text x="30" y="180" fill="#333">表：1040NR + 8843</text>
    <text x="30" y="196" fill="#333">FICA：豁免（追回）</text>
    <text x="30" y="212" fill="#333">Article 20：$5K 免税</text>
    <text x="30" y="228" fill="#333">Std deduction：中国例外</text>
    <text x="30" y="244" fill="#333">FBAR：不用报</text>
    <text x="30" y="260" fill="#333">8938：不用报</text>
    <text x="30" y="276" fill="#333">401k 匹配：建议拿</text>
    <text x="30" y="292" fill="#333">Roth IRA：broker 难开</text>
    <text x="30" y="308" fill="#333">HSA：可参加 if HDHP</text>
    <text x="30" y="328" fill="#a04030" font-weight="600">关键准备：</text>
    <text x="30" y="344" fill="#a04030">• 第 5 年 12 月：</text>
    <text x="30" y="358" fill="#a04030">  开 Schwab / 准备 Roth</text>
    <text x="30" y="374" fill="#a04030">• 第 5 年 12 月：</text>
    <text x="30" y="388" fill="#a04030">  盘点海外账户余额</text>
    <text x="30" y="402" fill="#a04030">• 提交 8233 续 treaty</text>
  </g>
  <g font-size="10">
    <rect x="200" y="140" width="160" height="280" rx="6" fill="#fdf2e1" stroke="#e57f00"/>
    <text x="280" y="158" text-anchor="middle" font-weight="600" fill="#e57f00">F-1 RA（6+ 年）</text>
    <text x="210" y="180" fill="#333">表：1040 + Schedule B</text>
    <text x="210" y="196" fill="#333">FICA：开始扣（7.65%）</text>
    <text x="210" y="212" fill="#333">Article 20：仍可（saving</text>
    <text x="210" y="226" fill="#333">  clause 学生例外，争议）</text>
    <text x="210" y="244" fill="#333">Std deduction：可用</text>
    <text x="210" y="260" fill="#333">FBAR：必须报（&gt; $10K）</text>
    <text x="210" y="276" fill="#333">8938：必须报（&gt; $50K）</text>
    <text x="210" y="292" fill="#333">401k：max contribute</text>
    <text x="210" y="308" fill="#333">Roth IRA：可开</text>
    <text x="210" y="328" fill="#a04030" font-weight="600">关键准备：</text>
    <text x="210" y="344" fill="#a04030">• 1 月：列海外账户</text>
    <text x="210" y="360" fill="#a04030">  → 报 FBAR / 8938</text>
    <text x="210" y="376" fill="#a04030">• 1 月：max Roth IRA</text>
    <text x="210" y="392" fill="#a04030">  $7K 当年额度</text>
    <text x="210" y="408" fill="#a04030">• 报税：FreeTaxUSA</text>
  </g>
  <g font-size="10">
    <rect x="380" y="140" width="160" height="280" rx="6" fill="#e6f5e6" stroke="#2e8b57"/>
    <text x="460" y="158" text-anchor="middle" font-weight="600" fill="#2e8b57">OPT → H-1B（转换年）</text>
    <text x="390" y="180" fill="#333">表：dual-status return</text>
    <text x="390" y="196" fill="#333">  或 first-year choice</text>
    <text x="390" y="212" fill="#333">  或 spousal election</text>
    <text x="390" y="230" fill="#333">FICA：H-1B 起开始扣</text>
    <text x="390" y="246" fill="#333">Article 20：H-1B 后失效</text>
    <text x="390" y="262" fill="#333">  （趁 F-1 段最后用）</text>
    <text x="390" y="280" fill="#333">RSU/ESPP：可能开始 vest</text>
    <text x="390" y="296" fill="#333">  → cost basis 调整必做</text>
    <text x="390" y="328" fill="#a04030" font-weight="600">关键准备：</text>
    <text x="390" y="344" fill="#a04030">• 找 CPA 模拟两种</text>
    <text x="390" y="360" fill="#a04030">  方案哪个更省</text>
    <text x="390" y="376" fill="#a04030">• 报税前确认 H-1B</text>
    <text x="390" y="392" fill="#a04030">  生效日期</text>
    <text x="390" y="408" fill="#a04030">• 旧雇主 W-2 / 1042-S</text>
  </g>
  <g font-size="10">
    <rect x="560" y="140" width="180" height="280" rx="6" fill="#f5e1f0" stroke="#b83280"/>
    <text x="650" y="158" text-anchor="middle" font-weight="600" fill="#b83280">H-1B / 绿卡 / 公民</text>
    <text x="570" y="180" fill="#333">表：1040 全年</text>
    <text x="570" y="196" fill="#333">FICA：照扣</text>
    <text x="570" y="212" fill="#333">全球收入：必须报</text>
    <text x="570" y="228" fill="#333">FBAR / 8938：每年报</text>
    <text x="570" y="244" fill="#333">RSU / ESPP：每年</text>
    <text x="570" y="260" fill="#333">  cost basis 调整</text>
    <text x="570" y="276" fill="#333">退休账户：max 全部</text>
    <text x="570" y="292" fill="#333">长期规划：Roth 转换/</text>
    <text x="570" y="308" fill="#333">  backdoor / mega backdoor</text>
    <text x="570" y="328" fill="#a04030" font-weight="600">关键准备：</text>
    <text x="570" y="344" fill="#a04030">• 找 CPA 长期合作</text>
    <text x="570" y="360" fill="#a04030">• 放弃绿卡前：</text>
    <text x="570" y="376" fill="#a04030">  评估 exit tax</text>
    <text x="570" y="392" fill="#a04030">• 每年 11-12 月：</text>
    <text x="570" y="408" fill="#a04030">  税务规划复盘</text>
  </g>
</svg>
<p class="img-caption">同一个中国留学生从 PhD 第一年到拿绿卡，税务身份会经过四个阶段，每个阶段的"该做什么"完全不同。提前一年规划就能避开大多数坑——临时抱佛脚通常已经晚了。</p>

# 4. Dual-Status Year 详解

**Dual-status year（双身份年）**是留学生最容易“算错税”的一年——典型场景：**OPT（F-1 NRA）下半年转 H-1B**，或者 **F-1 第 5 年中期 SPT 触发 RA**。

## 4.1 什么是 dual-status

一个日历年内你的税务身份**变了一次**——上半段 NRA + 下半段 RA（或反过来）。IRS 把这种“夹心年”叫做 **dual-status alien**。

**典型时间线**：

```
2026 年：
1/1  ─────── 5/31  ───────  9/30  ─────────── 12/31
  ← F-1 NRA →   ← OPT (仍 NRA) →   ← H-1B (RA) →
       (W-2 + 1042-S)      (W-2)              (W-2 + RSU vest)
```

## 4.2 Dual-status return 默认怎么报

**两份表合一报**：

- **主表**：**Form 1040**（“residency 截止时”的身份决定主表）
- **附表/statement**：**Form 1040NR**（标注 “Dual-Status Statement”），写 NRA 段的收入
- 整合在一起寄给 IRS

**Dual-status 的限制**（**为什么默认 dual-status 通常更亏**）：

| 限制 | 影响 |
|---|---|
| **不能用 standard deduction** | 中国学生在 NRA 段虽有例外，但 dual-status 整体不允许 std ded |
| **不能 Married Filing Jointly**（除非选 election）| 已婚收入要分开报 |
| **不能 Head of Household** | 单亲家庭抵免拿不到 |
| **Itemize only** | 无 itemize 项的话 deduction = $0$ |
| **退税通常更慢** | IRS 处理 dual-status 表慢得多 |

## 4.3 三个备选方案

### A. First-Year Choice（IRC §7701(b)(4)）

**前提**：当年没满足 SPT，但**第二年会满足**——选择“提前”被当作 RA。

- 适合：当年下半年开始 H-1B，但天数 $<183$；明年会满 SPT
- **效果**：把“夹心年”变成“全年 RA”——可以全年 standard deduction + MFJ
- **代价**：当年所有海外收入也要报

### B. Spousal Election（IRC §6013(g) / §6013(h)）

**前提**：你 / 配偶任意一方是 USC 或 LPR 或 RA。

- 选择把整个家庭“按全年 RA 联合报”
- **效果**：MFJ + standard deduction 翻倍 + 各种 credit 解锁
- **代价**：双方全球收入都要报 + **一旦选了就一直按 RA 报**（除非另作放弃声明）

### C. 默认 dual-status

- 不做任何 election——按上面 §4.2 的复杂方法报
- 适合：单身 + 当年 NRA 段收入低 + RA 段海外收入高（不想多报）

## 4.4 怎么选

**决策思路**（多数情况下）：

```
是否结婚？
├── 是 → 配偶是 USC/LPR/RA？
│       ├── 是 → 几乎一定选 §6013(g) Spousal Election（最省）
│       └── 否 → first-year choice + 6013(h) 把配偶也带入 RA
└── 否 → 当年 NRA 段收入是否远低于 RA 段？
        ├── 是 → first-year choice 把全年算 RA（拿 std deduction）
        └── 否 → 默认 dual-status（避免把海外收入也搬上来）
```

**实操建议**：**dual-status year 强烈建议找熟悉 international 的 CPA**——同一份 W-2 不同方案差 $1\text{-}5K$ 美元很常见。CPA 费用 $300\text{-}600$ 美元几乎肯定值回。

# 5. 退休账户与投资税务

## 5.1 雇主匹配 401(k)——**所有人都该 max match**

**401(k) 雇主匹配 = 你工资的一部分**——不拿就是白送雇主。

**典型规则**：你存工资的 $X\%$，雇主匹配 $X\% / 2$ 或 $X\%$（“100% match up to 5%”）。

| 你存 | 雇主匹配（典型 50%） | 雇主匹配（典型 100%）|
|---|---|---|
| $0\%$ | $0$ | $0$ |
| $5\%$（最低门槛）| **$2.5\%$** | **$5\%$** |
| $10\%$ | $2.5\%$（匹配封顶 5%）| $5\%$ |

**NRA 也能存 401(k)** —— 法律上没禁止。但**有两个细节**：

1. **NRA 提取 401(k) 时按 30% 预扣**（除非 tax treaty 降低）
2. **本人离开美国后取**——更复杂，要找跨国税务 CPA

**建议**：**F-1 NRA 阶段只 max 雇主匹配那部分**（拿“免费的钱”），**不 max 全部 \$23,500 上限**——剩余资金存到 RA 后再 max。

## 5.2 IRA / Roth IRA

**2026 IRA 上限**：$\$7,000$（under 50）/ $\$8,000$（50+）。

| 账户 | 存的时候 | 提的时候 | 适合 |
|---|---|---|---|
| **Traditional IRA** | 税前（deduct） | 按 ordinary 交税 | 高收入年 |
| **Roth IRA** | 税后（无 deduct） | **完全免税** | 低收入年 / 长期持有 |

**Roth IRA 收入限制**（2026 单身）：

- MAGI $<\$150K$：全额 contribute
- MAGI $\$150K\text{-}\$165K$：phase-out
- MAGI $>\$165K$：**不能直接 contribute**（但有 backdoor）

**NRA 能不能开 Roth IRA**？

- **法律上**：能——只要有“earned income”（W-2 / 1099）即可
- **实操上**：多数大 broker（Fidelity / Vanguard）**不让 NRA 开 IRA**（合规审查麻烦）
- **可用 broker**：**Charles Schwab** 对 NRA 较友好；部分小 broker 也允许
- **建议**：**第 5 年（最后一年 NRA）12 月开好 Schwab 账户**——第 6 年 1 月成 RA 后立刻 max Roth IRA $\$7K$

## 5.3 HSA（Health Savings Account）

**HSA = “终极税优账户”**——三重免税：

1. **存的时候**免税（deduct）
2. **投资增长**免税
3. **医疗用途提取**免税

**前提**：你必须参加 **HDHP（High-Deductible Health Plan）**。

**2026 上限**：

- 单人：$\$4,300$
- 家庭：$\$8,550$
- 55+：额外 $\$1,000$ catch-up

**NRA 能用 HSA**——只要 HDHP 资格满足。但**HSA 资金回国后取出**会按 ordinary income + $20\%$ penalty（如果非医疗用途且 $<65$ 岁）。

**实战**：PhD 学校经常提供 HDHP + HSA—— **存满 $\$4,300$/年**，把它当退休账户用（医疗用途 = 完全免税，非医疗用途 65 岁后 = Traditional IRA 等效）。

## 5.4 资本利得（capital gains）

| 持有期 | 税率 | 适用对象 |
|---|---|---|
| **Short-term**（$\leq 1$ 年）| 按 ordinary income bracket（$10\text{-}37\%$）| 所有人 |
| **Long-term**（$>1$ 年）| $0\% / 15\% / 20\%$（取决 income） | RA + USC |
| **NRA 资本利得**（境内 $<183$ 天）| **免联邦税** | NRA |
| **NRA 资本利得**（境内 $\geq 183$ 天）| **30%** flat | NRA |

**关键**：**F-1 NRA 学生通常在美国 $>183$ 天**——按理 30% 资本利得税。但 **IRC §871(a)(2) 给 NRA student / scholar 例外**——只要你持有 F-1 / J-1 身份，**资本利得仍免联邦税**。

**实战**：很多 F-1 学生在 Robinhood / Schwab 炒股——**多数情况下不用交联邦资本利得税**，但**仍要在 1040NR 上申报**（如实写“0 tax due”也是一种申报）。

## 5.5 股票分红（dividends）

| 类型 | 标准税率 | 中美 tax treaty 后 |
|---|---|---|
| **Qualified dividends**（USC/RA）| \$0/15/20\%$ | / |
| **NRA dividends** | $30\%$ 预扣 | **$10\%$**（中美 treaty Article 9）|

NRA 收 dividends 时 broker 会**自动按 $30\%$ 预扣**——但你提交 **W-8BEN** 并 claim 中美 treaty 后**降到 $10\%$**。

## 5.6 银行利息（interest）

**NRA 收美国银行 portfolio interest（包括 CD、储蓄）**：

- **多数情况免联邦税**（IRC §871(h)，“portfolio interest exemption”）
- 1099-INT 上写的预扣数应该是 $\$0$
- 如果 broker / 银行扣了，**用 Form 843 + 1040NR 退回**

# 6. 海外资产申报：FBAR / Form 8938

**这是 RA 留学生最容易漏报的一栏**——很多人第 6 年成 RA 后**还按 NRA 思路不报海外**，几年后被 IRS 通过 FATCA 数据交换查到 = 罚款 $\$10K+$ 起步。

## 6.1 FBAR（FinCEN Form 114）

**FBAR = Foreign Bank Account Report**——美国财政部 FinCEN 收，不是 IRS 收，但留学生通常一起处理。

| 项目 | 阈值 |
|---|---|
| **谁报** | US person（USC / LPR / **RA**）|
| **NRA 是否报** | **不报** |
| **触发条件** | 海外金融账户**总余额**任何时点 $>\$10,000$ |
| **怎么报** | [BSA E-Filing System](https://bsaefiling.fincen.treas.gov/) 电子报 |
| **截止日期** | 4 月 15 日（自动延到 10 月 15 日，无需申请）|
| **包含账户** | 银行、券商、支付宝余额 / 微信零钱通 / 余额宝 / 港股账户 / 海外保险现金价值 |
| **罚款（非故意）** | $\$10,000+$ 每个账户 |
| **罚款（故意）** | $\$100,000+$ 或账户余额 $50\%$（取大）|

**实战**：F-1 第六年（成 RA）的 1 月**就要**盘点：

- 国内 4 大行 + 招商 + 中信 储蓄账户
- 支付宝 / 微信 / 余额宝 / 招行朝朝盈
- 国内券商（华泰 / 中信建投 / 雪盈 等）
- 港股账户（富途 / 老虎 / 长桥）
- 父母代持但你是受益人的账户（争议但**多数 CPA 建议报**）

**总余额 $>\$10K$ 即报**——**$\$10K$ 是个低线**，多数留学生家里都过。

## 6.2 Form 8938（FATCA）

**Form 8938** 是和 1040 一起报的，跟 FBAR 是**两套独立报告**——**有可能同时报**。

| 项目 | 阈值 |
|---|---|
| **谁报** | US person（USC / LPR / RA）|
| **NRA 是否报** | **不报** |
| **境内单身阈值** | 年末 $\$50K$ 或任何时点 $\$75K$ |
| **境内已婚 jointly** | 年末 $\$100K$ 或任何时点 $\$150K$ |
| **境外居住单身** | 年末 $\$200K$ 或任何时点 $\$300K$ |
| **怎么报** | Form 8938 跟 1040 一起寄 |
| **罚款** | $\$10K+$ / 故意 $\$50K+$ |

**FBAR vs 8938**：

| 维度 | FBAR | Form 8938 |
|---|---|---|
| 谁收 | FinCEN | IRS |
| 阈值 | $\$10K$（任何时点）| $\$50K$ 起（年末或任何时点）|
| 怎么报 | 单独电子报 | 跟 1040 寄 |
| 资产范围 | 仅金融账户 | 金融账户 + 部分外国 entities + 部分股权 |

**实战**：多数 PhD/早期工作族——FBAR 必报（很容易过 $\$10K$），8938 看情况（$\$50K$ 阈值更高）。

## 6.3 一个常见误区

**“我钱在国内、我没汇到美国，凭什么报”**？

- 报的是**账户存在**，不是**资金流动**
- 即便钱一辈子留在国内，账户存在就要报
- 没汇钱过来 ≠ 没收入（利息也是收入，要报到 Schedule B）

# 7. 婚姻 / 子女 / 抚养税务

## 7.1 婚姻状态对税的影响

**Filing status** 决定标准抵扣 + 税率档：

| Status | 2026 Std Deduction | 适用 |
|---|---|---|
| **Single** | $\$15,000$ | 未婚 |
| **Married Filing Jointly (MFJ)** | $\$30,000$ | 已婚 + 联合报 |
| **Married Filing Separately (MFS)** | $\$15,000$ | 已婚但分开报（罕见）|
| **Head of Household (HoH)** | $\$22,500$ | 单亲 + 抚养小孩 |

**MFJ 通常省税**——但**NRA 配偶**有特殊规则：

- **NRA + NRA**：**不能 MFJ**——只能各自 Single 或 MFS
- **NRA + RA / USC**：默认 NRA 一方 Single（或 HoH if 抚养孩子）
- **NRA + RA / USC + §6013(g) Election**：选择 NRA 配偶按全年 RA 处理 → MFJ
  - **代价**：NRA 配偶全球收入要报
  - **何时值**：NRA 配偶低收入 + USC 高收入 → MFJ std ded $\$30K$ + lower bracket = 大省

## 7.2 子女税收抵免（Child Tax Credit）

**2026 标准**：每个 qualifying child $\$2,000$（其中 $\$1,700$ refundable）。

**关键限制**：

- **小孩必须有 SSN**——ITIN 不算（很多 F-2 出生在美国 = USC = 自动 SSN ✓；F-2 / J-2 出生在外国 = 通常 ITIN ✗）
- **小孩 $<17$ 岁** at end of year
- **小孩是 dependent**（住一起 $>6$ 个月 + 抚养费 $>50\%$）

**实战**：

- F-1 PhD 在美生小孩 → 小孩是 USC → 有 SSN → 父母即便 NRA 也能 claim CTC
- F-1 PhD 配偶带小孩来美 → 小孩 F-2 → 通常没 SSN → 申请 ITIN 但**ITIN 不能 claim CTC**

## 7.3 Dependent Care Credit / 学费

| 抵免 | 2026 上限 | 谁能用 |
|---|---|---|
| **Child & Dependent Care Credit** | 1 个 $\$3K$ / 2 个 $\$6K$ | RA + USC |
| **American Opportunity Credit (AOC)** | $\$2,500$/学生 | RA + USC（NRA 不能）|
| **Lifetime Learning Credit (LLC)** | $\$2,000$/家庭 | RA + USC |
| **Student Loan Interest Deduction** | $\$2,500$ | RA + USC（NRA 例外限制）|

**关键**：**F-1 NRA 学生 1098-T 上的学费没法在自己税表上 claim**——但 RA 后可以。

# 8. 房产 / 自雇 / 副业税务

## 8.1 买房

**美国买房的税务影响**：

| 项目 | 税务效果 |
|---|---|
| **Mortgage interest** | Itemize 时 deduct（上限 $\$750K$ 贷款利息）|
| **Property tax** | Itemize 时 deduct（SALT cap $\$10K$/年）|
| **Closing costs**（部分）| 部分一次性 deduct |
| **Mortgage insurance (PMI)** | 已废除 deductibility |
| **First-time homebuyer credit** | 已废除 |

**实战**：买房第一年通常 itemize $>$ standard deduction（$\$15K$）——如果 mortgage interest + property tax + state income tax + 慈善捐款 $>\$15K$ 就 itemize。

**NRA 买房**：

- 完全合法（美国不限制外国人买房）
- **卖房时**：**FIRPTA 预扣 $15\%$**——买家会从你的卖房款扣 $15\%$ 寄给 IRS
- 实际欠税通常 $<15\%$——次年报 1040NR 申请退回

## 8.2 出租收入

- 收入：Schedule E
- 可 deduct：mortgage interest / property tax / repairs / depreciation / insurance / management fee
- **NRA 出租收入**：默认 $30\%$ 预扣（gross）——但**选 §871(d) election**后可按净利润算 → 通常省税

## 8.3 自雇 / Consulting / 副业

**1099-MISC / 1099-NEC 收入**：

- Schedule C：业务收入与费用
- Schedule SE：自雇税（$15.3\%$ = SS $12.4\%$ + Medicare $2.9\%$）
- **F-1 NRA 通常不交 SE tax**（因为豁免 FICA）
- **OPT / CPT 期间副业**：身份限制——必须与 EAD / I-20 一致

**Side hustle 警告**：

- $\$400+$ 副业收入即触发 SE tax（除非 NRA 豁免）
- 即便没收到 1099 也要报（IRS 通过其他数据交叉核实）
- 没报 + 被查 = 罚款 $20\%+$ + 利息

# 9. 长期税务优化策略

## 9.1 Tax-Loss Harvesting

**亏损股票卖掉**：

- 卖出 short-term loss → offset short-term gain
- 卖出 long-term loss → offset long-term gain
- 净 capital loss → 最多 $\$3,000$/年 offset ordinary income
- 剩余 carry forward 到明年

**Wash sale rule**：

- 卖出 30 天内**买回同一支或“substantially identical”股票** → loss disallow
- 替代方案：卖出 VTI 后买 VOO（不同基金但相似）

## 9.2 Roth Conversion Ladder

**Traditional IRA / 401(k) → Roth IRA / Roth 401(k) 转换**：

- 转的时候按 ordinary income 交税
- 转换后增长 + 提取永远免税
- **最佳时机**：**低收入年**（PhD 期间 / gap year / 提前退休年）

**典型 PhD 操作**：

- 第 6 年成 RA + 收入 $\$30K\text{-}\$50K$（低 bracket）
- 把任何已有的 Traditional IRA 余额（如果有）转 Roth
- 交完税后未来增长全免

## 9.3 Backdoor Roth IRA

**收入高于 Roth IRA phase-out（$>\$165K$ 单身）**也想 Roth：

1. 给 **Traditional IRA non-deductible contribute** $\$7K$（无收入限制）
2. **立刻转 Roth IRA**（Form 8606）
3. 完全合法 + 公开

**注意 pro-rata rule**：

- 如果你 Traditional IRA 已有 pre-tax 钱（比如 401k rollover 进来），转换会按比例算税
- 干净 backdoor：Traditional IRA 余额 = $\$0$ 时操作

## 9.4 Mega Backdoor Roth（雇主允许时）

**雇主 401(k) 允许 after-tax contribution + in-plan Roth conversion**：

- 401(k) 总上限 $\$70,000$（2026）= pre-tax/Roth $\$23,500$ + 雇主匹配 + after-tax up to total
- After-tax 部分立刻 in-plan convert to Roth → 巨额 Roth 额度
- **谁有**：Google / Meta / Microsoft / Amazon / Netflix 等大科技公司常见——**入职时 HR 问“是否支持 mega backdoor”**

## 9.5 Tax-Advantaged Account 优先级

**典型留学生 → 早期工作族顺序**：

```
① 401(k) 雇主匹配（拿"免费的钱"）→ 必拿
② HSA（如有 HDHP）→ max $4,300
③ Roth IRA（如收入符合）→ max $7,000
④ 401(k) max 剩余 → max $23,500
⑤ Mega Backdoor Roth（如雇主允许）→ 大额
⑥ Taxable brokerage → 其余
```

# 10. 什么时候找 CPA

## 10.1 自己报够用的情况

- ✅ F-1 NRA + W-2 only → Sprintax
- ✅ F-1 RA + W-2 + 1099-INT → FreeTaxUSA
- ✅ H-1B 单身 + W-2 only → FreeTaxUSA / TurboTax
- ✅ H-1B 家庭 + W-2 + Roth IRA → TurboTax Deluxe

## 10.2 强烈建议找 CPA 的情况

- ⚠️ **Dual-status year**（OPT → H-1B）
- ⚠️ **跨国婚姻**（NRA + USC + 6013(g) election）
- ⚠️ **多州收入 + itemize 复杂**
- ⚠️ **出租房 / Schedule C 自雇**
- ⚠️ **海外资产 FBAR / 8938 边界情况**
- ⚠️ **RSU + ESPP + AMT 风险**
- ⚠️ **放弃绿卡 / Exit Tax 评估**
- ⚠️ **被 IRS audit / 收到 CP2000 通知**

## 10.3 怎么找

**几条原则**：

- **找熟悉 international 的 CPA**——必须懂 NRA / dual-status / tax treaty
- **价格**：简单 $\$200\text{-}600$，复杂 $\$500\text{-}2000+$
- **不要找街边 H&R Block “tax preparer”**——多数不懂 NRA，会按 USC 思路填错表
- **留学生圈**：北美华人 CPA / 大学城税务事务所 / [一亩三分地 “报税” 版块](https://www.1point3acres.com/bbs/forum-208-1.html)推荐

**面试 CPA 问 3 个问题**：

1. “你处理过多少个 F-1 / H-1B / dual-status 客户？”（少于 50 个不考虑）
2. “你怎么决定 §6013(g) election 该不该做？”（答不出 = 不熟）
3. “FBAR 和 Form 8938 的阈值差异和包含范围有什么不同？”（答错 = 不专业）

# 11. 几个反直觉的进阶常识

## 11.1 RSU / ESPP cost basis 必须自己调

**最容易导致双重征税的报税错误**：

- RSU vest 时按 fair market value 算 ordinary income → 已交税 → W-2 上反映
- 卖 RSU 时 broker（Schwab / Fidelity / E*TRADE）的 **1099-B 上的 cost basis 经常写 $\$0$ 或只算 grant 价**
- 直接照抄 1099-B → 同一笔钱**交两次税**

**正确做法**：

- Vest 时记下 fair market value（W-2 box 14 / supplement info）
- 卖出时用 fair market value 作为 cost basis
- Form 8949 上 column (g) “Adjustment” 加 code “B” 修正
- TurboTax / FreeTaxUSA 通常会问“是否需要 cost basis 调整”

ESPP 同理：折扣部分算 ordinary income → cost basis = purchase price + 已 included ordinary income。

## 11.2 F-1 NRA 第 5 年 12 月开 Schwab——为第 6 年 1 月开 Roth IRA 铺路

**多数大 broker 不让 NRA 开 IRA**——但 **Charles Schwab 对 NRA / international 较友好**：

- F-1 NRA 第 5 年 12 月：开 Schwab brokerage 账户
- 1 月 1 日（成 RA 第一天）：max Roth IRA $\$7K$ 当年额度
- 这 $\$7K$ 从 2027 年开始永远免税增长——**40 年后 $\$200K+$ 完全免税**

**错过第六年 1 月**——当年 $\$7K$ Roth 额度永远没了（Roth 额度不能补）。

## 11.3 W-4 调整 vs 退税幻觉

**多数留学生退税 $\$1K\text{-}\$2K$ 觉得“赚了”**——但本质是**你借给 IRS 一年无息钱**。

**正确做法**：

- 入职时填 W-4 时把 withholding 精确到 0 退税 0 补税
- 多出来的现金流自己投资 / 还学贷 / 存 401k
- “退税 = 自己存钱被 IRS 帮你保管”——**亏 inflation**

实操：每年 1 月用 IRS Withholding Calculator 复算 W-4。

## 11.4 海外亲属汇款不是收入

**父母从国内汇给你 $\$50K$ 学费 / 生活费——不是收入**：

- **Gift（赠与）不是 income**——你不用报税
- 但**收 $>\$100,000$/年外国 gift** 要报 **Form 3520**（不交税，只申报）
- 不报罚款 $\$10K+$

**实战**：父母分多次汇 + 单笔 $<\$10K$ 不会触发任何报告——但金额大时**3520 必报**。

## 11.5 放弃绿卡 / 弃籍 Exit Tax

**长期 LPR（持绿卡 8/15 年）或 USC 放弃身份**：

- 触发 **Exit Tax**——IRS 假装你“全部资产卖掉”算 capital gains
- 阈值：净资产 $>\$2M$ 或近 5 年平均年税 $>\$200K$（covered expatriate）
- 一次性补税可能 $\$100K\text{-}\$1M+$
- Form 8854 申报

**实战**：留学生 → 绿卡 → 多年后回国/换国籍——**放弃前 1 年找 CPA 规划**（卖资产时机 / gift 转移 / Roth conversion 提前用低 bracket）。

## 11.6 IRS Audit 概率虽低，USCIS 必查

**报税历史的“二阶用途”**：

- IRS 实际 audit 留学生 / 早期工作族概率 $<1\%$
- **USCIS 申请 H-1B 延期 / 绿卡 / 入籍时——必查报税历史**
- 一笔 NRA 用错 1040 / 漏报 1042-S / FBAR 没报 → 几年后 RFE / 拒签
- 主动 amend（1040X）罚款轻得多

**报税不只是“今年的事”**——它是给未来 5-10 年自己的“清白档案”。

# 12. 参考来源

1. **[IRS Publication 519 - U.S. Tax Guide for Aliens](https://www.irs.gov/pub/irs-pdf/p519.pdf)** —— NRA / dual-status / spousal election 圣经
2. **[IRS Publication 590-A - IRA Contributions](https://www.irs.gov/pub/irs-pdf/p590a.pdf)** —— IRA / Roth IRA 详细规则
3. **[IRS Publication 590-B - IRA Distributions](https://www.irs.gov/pub/irs-pdf/p590b.pdf)** —— 提取规则 + Roth conversion
4. **[IRS Form 8606 Instructions](https://www.irs.gov/pub/irs-pdf/i8606.pdf)** —— Backdoor Roth / non-deductible IRA 申报
5. **[FinCEN BSA E-Filing System](https://bsaefiling.fincen.treas.gov/)** —— FBAR 申报入口
6. **[IRS Form 8938 Instructions](https://www.irs.gov/pub/irs-pdf/i8938.pdf)** —— FATCA 申报详细规则
7. **[IRS Publication 901 - U.S. Tax Treaties](https://www.irs.gov/pub/irs-pdf/p901.pdf)** —— 中美 tax treaty 各 Article 详解
8. **[IRS Form 8854 Instructions](https://www.irs.gov/pub/irs-pdf/i8854.pdf)** —— Exit Tax / 放弃绿卡 申报
9. **[Bogleheads Wiki - International Investing](https://www.bogleheads.org/wiki/Non-US_investor%27s_guide_to_navigating_US_tax_traps)** —— 国际投资者税务社区
10. **[一亩三分地“报税”版块](https://www.1point3acres.com/bbs/forum-208-1.html)** —— 中文圈实战经验
11. **[白丁话财 (Bogleheads 中文)](https://www.bogleheads.org/)** —— 退休账户长期规划

---

**报税三部曲到这里完结**——三篇连起来：

- **第 1 篇**[报税基础](/life/us-tax-basics-for-students)——身份、术语、关键规则
- **第 2 篇**[报税实战](/life/us-tax-filing-process)——填表、软件、退税、跨州
- **第 3 篇**（本篇）——跨阶段长期规划、dual-status、退休账户、海外申报、CPA

留学生报税 = **信息不对称严重的“知识投资”**——多数中国学生不知道 tax treaty / FICA 豁免 / Roth IRA / FBAR / dual-status——每年错失或多交几千美元 + 留下 USCIS 风险记录。

但**机制并不难**——把这三篇连起来读一遍，再每年 1 月跟着 IRS 当年的数字校准一遍——**你已经领先 $90\%$ 的同辈留学生**。

报税这件事每年要做，搞清楚机制就是**终身的回报**。第 5 年 12 月开 Schwab 那一刻——你已经领先了。
