export const meta = {
  name: 'econ-math-write-part',
  description: '为《经济学博士的数学工具箱》写一个 Part：每章 draft→对抗式审校→修（含图自渲染查重叠）',
  phases: [
    { title: 'Draft', detail: '按规格写每一章 LaTeX，自渲染每张图' },
    { title: 'Verify', detail: '对抗式审校：数学正确性/未定义宏/三件套/口吻/逐图查重叠' },
    { title: 'Fix', detail: '按审校问题外科手术式修订' },
  ],
}

const SRC = '/Users/zhourui/Desktop/ruizhou03.github.io/files/econ-math-toolkit/source'
// ⚠️ args 传参在本环境不可靠（实测回退到默认）；逐 Part 写时直接改这里的默认清单。
// 当前活跃：Part VIII 随机过程（ch40–42，全书最后一个 Part）。Part I–VII 已完工并装订（见 playbook / git）。
const partName = (args && args.partName) || 'Part VIII 随机过程'
const CHAPTERS = (args && args.chapters) || [
  {
    slug: 'markov', file: 'ch40_markov_chains.tex', title: 'Markov 链：平稳分布与遍历性',
    spec: [
      '覆盖：Markov 性（无记忆）；转移矩阵 \\mat P（拉丁字母 P 用 \\mat 没问题）；n 步转移与 Chapman–Kolmogorov（=矩阵幂，接特征值/对角化一章）；状态分类（常返/暂留、周期）；平稳分布 \\vc\\pi（满足 \\vc\\pi \\mat P=\\vc\\pi，即转移矩阵特征值 1 的左特征向量）；遍历定理（不可约+非周期 ⇒ 收敛到唯一平稳分布、且时间平均=空间平均）；细致平衡（可逆链）。【注意：平稳分布向量 \\vc\\pi、若用到大写 Π 必写 \\vc\\Pi，切勿 \\mat\\pi/\\mat\\Pi】',
      '①用处：Markov 链是离散状态随机经济模型的基础——就业/失业、繁荣/衰退等冲击、随机增长、MCMC 贝叶斯计算、排队；平稳分布=长期均衡分布；遍历性=能用一条长样本路径估计总体（时间序列版的大数定律）。',
      '②推导：Chapman–Kolmogorov（n 步转移=矩阵幂，接对角化一章）；平稳分布作为 \\vc\\pi\\mat P=\\vc\\pi 的解（=特征值 1 的左特征向量，接特征值一章与 Perron–Frobenius 直觉）；遍历定理的陈述 + 收敛直觉；细致平衡 ⇒ 平稳。',
      '③去处：随机动态规划的冲击过程（接随机动态规划一章）、MCMC（贝叶斯计量）、财富分布动态（Aiyagari）、时间序列遍历性（渐近理论的前提，接大数定律一章）、PageRank。',
      '建议图：状态转移图（几个状态结点 + 带转移概率的有向箭头，经典 Markov 链图）；或分布随 n 收敛到平稳分布 \\vc\\pi 的演化（几组条形分布逐步逼近）。结点/箭头/概率标注清晰、无重叠。',
    ].join('\n'),
  },
  {
    slug: 'martingale', file: 'ch41_martingales.tex', title: '鞅', hasDraft: true,
    spec: [
      '覆盖：filtration（信息流，接 σ-代数一章）；鞅定义 E[X_{t+1}|cF_t]=X_t（接条件期望一章）；上鞅/下鞅；鞅差分序列；可选停时定理（optional stopping）；鞅收敛定理（陈述）；例（随机游走、似然比、资产价格）。',
      '①用处：鞅是“公平博弈/不可被系统性预测”的数学化——有效市场假说（价格是鞅）、理性预期（预测误差是鞅差分）、贝叶斯后验是鞅（接贝叶斯一章）、随机贴现下的资产定价；也是证明极限定理（鞅 CLT）与序贯分析的工具。',
      '②推导：鞅定义与塔性质（接条件期望一章）；可选停时定理（陈述 + “赌徒无法靠停时策略稳赚”直觉）；鞅收敛定理（陈述）；无套利 ⇒ 价格在风险中性测度下是鞅。',
      '③去处：有效市场与资产定价（鞅测度、风险中性定价）、理性预期（预测误差正交于信息=鞅差分）、鞅 CLT（时间序列渐近）、序贯检验、随机逼近。',
      '建议图：一条鞅样本路径（随机游走），在当前时刻 t 处画出“未来的条件期望持平于当前值 X_t”的水平虚线（几条可能的未来路径围绕该水平展开）；或上鞅/下鞅的漂移方向对照。标注无重叠、当前点与持平线精确。',
    ].join('\n'),
  },
  {
    slug: 'brownian', file: 'ch42_brownian_ito.tex', title: '布朗运动与 Itô 引理', hasDraft: true,
    spec: [
      '覆盖：布朗运动定义（独立增量、增量服从 N(0,Δt)、路径连续但处处不可微）；二次变分（(dW)²=dt）；Itô 积分（为何不能照搬普通积分——路径不可微）；Itô 引理（df=f′ dX+½ f″ (dX)²，比普通链式法则多出 ½ f″ σ² dt 项）；几何布朗运动（资产价格）；随机微分方程 SDE。',
      '①用处：连续时间金融与宏观的语言——资产价格（几何布朗运动）、Black–Scholes 期权定价、随机最优控制、实物期权、利率模型；Itô 引理是连续时间随机演算的“链式法则”。',
      '②推导：布朗运动作为随机游走的极限（接中心极限定理一章）；二次变分 (dW)²=dt 的直觉；Itô 引理（对 f 做到二阶的 Taylor 展开，接 Taylor 一章，再代入 (dW)²=dt 得多出的二阶项）；用 Itô 引理解几何布朗运动。',
      '③去处：Black–Scholes（期权定价 PDE）、连续时间资产定价（风险中性测度，接鞅一章）、随机最优控制（HJB 方程，连接最优控制与动态规划两章）、实物期权与不可逆投资、利率/宏观金融模型。',
      '建议图：布朗运动的若干样本路径（连续而锯齿状、不可微，配方差 ∝ t 随时间张开的包络带）；或 Itô 引理“多出来的 ½ f″ dt 项”的凸性修正直觉。路径/包络/标注无重叠、几何正确。',
    ].join('\n'),
  },
]

const STYLE = `你正在为一本面向**经济学博士生**的中文研究生数学教材《经济学博士的数学工具箱》撰写其中一章。这本书已确定用 XeLaTeX + ctexbook 编译、上线网站，是一次成型的永久产物。

【动手前必读这几份文件（用 Read）】
- ${SRC}/chapters/ch15_ift_comparative_statics.tex —— 黄金范本（隐函数定理一章，已获用户批准）。你这章的口吻、结构、盒子用法、配图风格、三件套，全部照它。
- ${SRC}/commands.tex —— 可用的数学宏清单（**只许用这里定义过的宏**）。
- ${SRC}/theorems.tex —— 彩色盒子系统。
- ${SRC}/main.tex 顶部「如何阅读本书 / 记号约定」与 42 章规划注释。

【核心写法：三件套】每个知识点都要回答——①它解决什么问题（用处/工具性，先讲经济学动机）→ ②它从哪来（关键推导 + 直觉，让读者能自己重建）→ ③它以后用在哪（指向 micro/macro/metrics 的具体落点与后续章节）。

【结构】本章首行写一句楷体「用到的前置工具：……」（仿范本首行，用 \\emph{...}）；随后一段平实引子说清这章解决什么问题、为何引入这个工具；正文用盒子标出定义/定理/假设，配 worked example（\\ex + \\sol）与注（\\rmkb）；关键的工具性提炼放进淡紫要点框 \\state{标题}{正文}。

【盒子】\\defn{标题}{体}（定义·绿）、\\thm{标题}{体}+\\pf{证明}（定理·蓝）、\\prop \\lem \\cor \\fact、\\asm{标题}{体}（假设·粉）、\\ex[名]{题}、\\sol{解}、\\rmkb[名]{注}、\\rmk{行内注}、\\state{标题}{要点}。证明环境名为 proof（中文“证明”）。

【数学】正确性压倒一切，任何公式不确定就自己推导核验。证明以“讲明白”为准；极重的纯数学构造（如存在性的拓扑证明）可只陈述+给直觉、不逐行搭。

【记号/宏】只用 commands.tex 已定义的宏：矩阵 \\mat{A}、向量 \\vc{x}、转置 \\T、逆 \\inv{...}、期望 \\E{X}（自动配括号，条件用 \\given：\\E{Y \\given X}）、方差 \\Var{X}、协方差 \\Cov{X}{Y}（注意 \\Corr 是无参算子：相关系数写 \\Corr(X,Y)、不要写 \\Corr{X}{Y}）、概率 \\Prob{A}、梯度 \\grad、全导数算子 \\D（如 \\D_{\\vc x}\\mat F）、偏导 \\pd{f}{x}、二阶交叉 \\pdc{f}{x}{y}、实数集 \\RR、收敛 \\pto \\dto 等。**绝不使用未定义的宏**（拿不准就 grep commands.tex 或改用基础 LaTeX）。\n⚠️【粗体大写希腊字母矩阵必须用 \\vc，不能用 \\mat】本书 XeLaTeX+ctex(macnew) 字体下 \\mat（即 \\mathbf）作用于大写希腊字母会渲染成【空白/字形消失】！所以转移矩阵 Π 写 \\vc\\Pi、协方差阵 Σ 写 \\vc\\Sigma、对角阵 Λ 写 \\vc\\Lambda——一律 \\vc，不要写 \\mat\\Pi/\\mat\\Sigma/\\mat\\Lambda。拉丁字母矩阵（A、P、V…）才用 \\mat。配图后务必把每张图与每条含希腊矩阵的正文公式渲染出来、确认字形没消失。

【语气禁忌】研究生教科书口吻。禁考试腔（不写 tier/答题模板/天数倒计时）。禁 AI 腔（不堆“值得注意的是/综上所述”等套话、不滥用 \\boxed、中文不用斜体——强调用 \\emph（楷体）或 \\textbf）。

【纯 LaTeX】不要 markdown、不要代码围栏、不要 R 代码、不要隐藏字符（U+200B 零宽空格 / U+3000 全角空格）。表格用 booktabs。

【交叉引用】同一 Part 内章节可用 \\label/\\ref；引用**其它 Part 的主题一律用名称、不用硬章号**（如「见后文『包络定理』一章」「在渐近统计部分」），因为全书章号最终装订前不定。label 约定：节 \\label{sec:<本章slug>-<n>}、图 \\label{fig:<本章slug>-<n>}；章首 \\label{ch:<本章slug>}。

【图——铁律，用户特别在意】
- 凡有助于理解就配图（用户要求多上图）。每图：figure[h] + tikzpicture + \\caption + \\label{fig:slug-n}。
- 文字/标签/箭头/标记**绝不与曲线、坐标轴、其它标签重叠**。标签停在空白区；必要时用细引线指向目标，但引线**不得穿过曲线**。
- **点必须按方程算坐标、精确落在曲线上**，别目测（范本曾因目测把切点画飞，务必引以为戒）。
- **每张图都要自渲染 + 肉眼检查后才算完成**：把单个 tikzpicture（不含 figure/caption）写进 ${SRC}/_fig_snippet.tex，在 ${SRC} 下运行 \`xelatex -interaction=nonstopmode _fig_preview.tex\` 再 \`pdftoppm -png -r 150 _fig_preview.pdf /tmp/figchk\`，然后 Read 渲染出的 png 逐项核对（重叠？几何对不对？点在线上吗？）。不过关就改坐标重渲染。检查完把临时图换成下一张继续。`

function draftPrompt(ch) {
  return `${STYLE}

————————————————
【你要写的这一章】
标题：${ch.title}
本章 slug（用于 label）：${ch.slug}
输出文件：${SRC}/chapters/${ch.file}

【内容规格】
${ch.spec}

现在动手：先 Read 上面要求的几份文件吃透风格与可用宏，然后写出**完整的一章** LaTeX 到输出文件（\\chapter{...}\\label{ch:${ch.slug}} 起头）。每张图都按图铁律自渲染 + Read 检查、确认无重叠且几何正确后再定稿。写完用 _fig_preview 工装把本章每张图都过一遍。返回：本章写了哪些节、共几张图、每张图自检结论（是否无重叠/几何正确）、自评哪里最可能有问题。`
}

function verifyPrompt(ch) {
  return `你是这本中文研究生数学教材的对抗式审校。请审 ${SRC}/chapters/${ch.file}（标题：${ch.title}）。先 Read 该文件、${SRC}/commands.tex、${SRC}/theorems.tex、以及范本 ${SRC}/chapters/ch15_ift_comparative_statics.tex。

逐项严格检查并**找毛病**（默认怀疑、自己动手核验）：
1. 数学正确性：逐个定义、定理陈述、推导步骤、例题计算都核验；可疑处自己重新推导。记下每个错误的位置、问题、建议改法。
2. 未定义宏：列出任何用了但 commands.tex/theorems.tex 没定义的宏。
3. 三件套：①用处 ②推导/直觉 ③去处 是否都到位？缺哪块？
4. 口吻：是否有考试腔/AI 套话/中文斜体/滥用 boxed？是否符合范本的教科书口吻？
5. 图（关键）：对本章**每一张** tikzpicture，用工装实际渲染检查——把该 tikzpicture 写进 ${SRC}/_fig_snippet.tex，在 ${SRC} 下 \`xelatex -interaction=nonstopmode _fig_preview.tex\` + \`pdftoppm -png -r 150 _fig_preview.pdf /tmp/figchk\`，Read png，判断：文字/标签/箭头是否与曲线或坐标轴重叠？点是否精确在曲线上？几何是否正确传达概念？逐图给结论。
6. 交叉引用：是否误用其它 Part 的硬章号（应改名称引用）？label 是否规范？
7. 可编译性：语法是否会让 XeLaTeX 报错。

**不要修改文件**，只返回结构化报告。`
}

function fixPrompt(ch, issues) {
  return `请根据对抗式审校报告，外科手术式修订 ${SRC}/chapters/${ch.file}（标题：${ch.title}）。先 Read 该文件与 ${SRC}/commands.tex。

审校报告（JSON）：
${JSON.stringify(issues, null, 2)}

逐条处理：修数学错误、替换/补定义未定义宏（优先改用已有宏或基础 LaTeX）、补齐三件套缺口、清考试腔/AI 腔、修正交叉引用。**重点修图的重叠/几何/点不在线上**：重算坐标，改完用工装重渲染（写 _fig_snippet.tex → xelatex _fig_preview → pdftoppm → Read png）确认无重叠才算修好。别重写本就好的段落。修完返回做了哪些修改、还剩哪些隐患、重渲染了几张图。`
}

const ISSUES_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    compiles: { type: 'boolean' },
    figuresChecked: { type: 'integer' },
    figuresWithOverlapOrError: { type: 'integer' },
    mathErrors: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { location: { type: 'string' }, problem: { type: 'string' }, suggestedFix: { type: 'string' } },
      required: ['location', 'problem', 'suggestedFix'] } },
    undefinedMacros: { type: 'array', items: { type: 'string' } },
    figureIssues: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { figureLabel: { type: 'string' }, issue: { type: 'string' } },
      required: ['figureLabel', 'issue'] } },
    styleIssues: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { location: { type: 'string' }, issue: { type: 'string' } },
      required: ['location', 'issue'] } },
    threePartCoverage: { type: 'string' },
    crossRefIssues: { type: 'array', items: { type: 'string' } },
    overallAssessment: { type: 'string' },
  },
  required: ['compiles', 'figuresChecked', 'figuresWithOverlapOrError', 'mathErrors', 'undefinedMacros', 'figureIssues', 'styleIssues', 'threePartCoverage', 'overallAssessment'],
}

const FIX_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    fixesApplied: { type: 'array', items: { type: 'string' } },
    figuresReRendered: { type: 'integer' },
    remainingConcerns: { type: 'array', items: { type: 'string' } },
    notesForMainLoop: { type: 'string' },
  },
  required: ['fixesApplied', 'figuresReRendered', 'remainingConcerns', 'notesForMainLoop'],
}

// 整 Part 从头写=false（draft→verify→fix）；某些章初稿已在盘上、只想补审校时改 true。
const SKIP_DRAFT = false
// 临时只跑某几章（slug）；为空数组=跑全部（默认）。补跑个别章时填入对应 slug。
const ONLY_SLUGS = []

log(`${SKIP_DRAFT ? '审校+修订' : 'draft→verify→fix'} ${partName}：共 ${CHAPTERS.length} 章`)

// 按章跳过 draft：ch.hasDraft=true 表示初稿已在盘（上一轮被中断但已落盘），只补 verify→fix。
const draftStage = (ch) => ch.hasDraft
  ? Promise.resolve(`draft 已存在，跳过：${ch.file}`)
  : agent(draftPrompt(ch), { label: `draft:${ch.slug}`, phase: 'Draft' })
const verifyStage = (prev, ch) => agent(verifyPrompt(ch), { label: `verify:${ch.slug}`, phase: 'Verify', schema: ISSUES_SCHEMA, effort: 'high' })
const fixStage = (issues, ch) => agent(fixPrompt(ch, issues), { label: `fix:${ch.slug}`, phase: 'Fix', schema: FIX_SCHEMA })
  .then((fix) => ({ slug: ch.slug, file: ch.file, title: ch.title, issues, fix }))

const stages = SKIP_DRAFT ? [verifyStage, fixStage] : [draftStage, verifyStage, fixStage]

const RUN = ONLY_SLUGS.length ? CHAPTERS.filter((c) => ONLY_SLUGS.includes(c.slug)) : CHAPTERS
const results = await pipeline(RUN, ...stages)

return results.filter(Boolean)
