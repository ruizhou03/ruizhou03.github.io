---
layout: post
title: "从零搭一套 Zotero：文献库、群组库，再和 LaTeX / Word 联动"
main_category: "科研妙招"
sub_category: "文献管理"
date: "2026-05-20"
author: "Zircon"
permalink: "/research/literature/zotero-setup"
published: true
keywords: ["Zotero 教程", "Zotero 从零", "文献管理软件", "参考文献管理", "reference manager", "Zotero vs EndNote", "Zotero vs Mendeley", "Zotero Connector 浏览器插件", "一键抓取文献", "DOI 导入", "Zotero PDF 重命名", "Zotero 同步", "WebDAV", "Better BibTeX", "稳定 citekey", "引文键 citation key", "自动导出 bib", "library.bib", "Zotero LaTeX", "Zotero Word 插件", "cite while you write", "CSL 引用样式", "Chicago author-date", "APA 格式", "期刊引用格式", "Zotero 群组库", "group library 合作者", "共享文献库", "Zotero 7", "文献去重", "Zotero 标签 分类", "wenxian guanli", "Zotero 设置"]
---


文献管理软件早就该是研究生的标配，但很多人要么还在文件夹里堆 `paper(3)_final.pdf`，要么被 EndNote 的体验劝退。我的结论很直接：**用 Zotero**——免费、开源、社区活跃，浏览器一键抓取，和 LaTeX、Word、R Markdown 都能干净联动。这篇从零搭一套能用一整个博士周期的配置。

## 一、装三个东西

1. **Zotero 本体**（[zotero.org](https://www.zotero.org/)，现在是 Zotero 7，界面和性能比老版本好很多）；
2. **Zotero Connector**：装到日常用的浏览器，网页上看到论文时一键入库；
3. （强烈建议）**Better BibTeX 插件**——LaTeX 用户的命根子，下一节专门讲。

注册一个免费账号开同步：元数据无限同步，附件文件免费 300 MB。文件超了别急着付费，第四节有省钱方案。

## 二、把文献抓进来

四种姿势，按顺手程度排：

- **网页一键**：在期刊页 / Google Scholar / arXiv / NBER 页面点浏览器里的 Connector 图标，元数据和 PDF 一起进库。这是 90% 的入库方式。
- **标识符导入**：Zotero 顶部点“魔棒”图标，粘 DOI / arXiv ID / ISBN，自动补全元数据。手头只有一个 DOI 时最快。
- **拖 PDF 进去**：直接把 PDF 拖进 Zotero，它会尝试反查元数据（成功率看 PDF 质量，工作论文经常失败，得手补）。
- **从别处导入**：EndNote / Mendeley 跑路过来的，导出 `.ris` 或 `.bib` 再 File → Import。

入库后花十分钟做两件一劳永逸的事：

- **设 PDF 自动重命名**：设置里把附件命名规则设成 `{作者}-{年份}-{标题}`，从此本地文件名都是人能读的；
- **建文件夹（collection）+ 标签**：按项目而不是按学科建 collection（“job-market-paper”“二审材料”），跨项目的主题用标签——一篇文献能进多个 collection，不用复制。

## 三、Better BibTeX：LaTeX 用户必装

原生 Zotero 导 `.bib` 时，引文键（citation key）可能变来变去，`\cite{}` 就会全断。[Better BibTeX](https://retorque.re/zotero-better-bibtex/)（BBT）解决两件致命的事：

**1. 稳定、可读的 citekey。** 设成 `[auth][year]` 这类格式，`Acemoglu2001` 这种键生成出来就固定不变。关键操作：选中条目右键 **Pin BibTeX key**——把键钉死，之后改标题、改作者都不会让它漂移，已经写进论文的 `\cite` 永远不会断。

**2. 自动保持 `.bib` 与库同步。** 右键 collection → **Export Collection**，勾 **Keep updated**，导出到项目里：

```
my-paper/
└── paper/
    ├── main.tex
    └── refs.bib      ← BBT 实时同步，库里加一篇这里就多一条
```

`main.tex` 里照常 `\bibliography{refs}` / biblatex 的 `\addbibresource{refs.bib}`，写作时再也不用手动维护 `.bib`。BibTeX 字段里要写公式或保护大小写，BBT 也会按规则处理（如 `{DSGE}` 不被小写化）。

## 四、同步与省钱

免费 300 MB 附件很快会被 PDF 塞满。两条路：

- **省钱**：用 WebDAV（坚果云、自建等）存附件，元数据仍走 Zotero 官方同步——附件容量不要钱。设置 → 同步 → 文件同步选 WebDAV。
- **省事**：直接订 Zotero 付费存储，全自动多设备同步，适合不想折腾的人。

无论哪条，**别把整个 Zotero 数据目录塞进 Dropbox 自己同步**——多设备同时写会把数据库搞坏，这是经典翻车。

## 五、和写作工具联动

<svg viewBox="0 0 620 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Zotero 文献库作为唯一真相来源，向下分发到 LaTeX（BBT 导出 refs.bib）、Word（Zotero 插件 CSL）、R Markdown / Quarto（@citekey + CSL）三个写作工具" style="width:100%;max-width:620px;display:block;margin:1.5rem auto;font-family:sans-serif;">
  <title>Zotero 与 LaTeX / Word / R Markdown 的联动示意图</title>
  <defs><marker id="z" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#666"/></marker></defs>
  <rect x="220" y="20" width="180" height="56" rx="8" fill="#eef3fb" stroke="#3b6ea5"/>
  <text x="310" y="44" text-anchor="middle" font-size="14" fill="#1f3b5b">Zotero 文献库</text>
  <text x="310" y="62" text-anchor="middle" font-size="11" fill="#5a7">唯一真相来源</text>
  <rect x="30" y="160" width="170" height="56" rx="8" fill="#fdf3e7" stroke="#b07b2f"/>
  <text x="115" y="184" text-anchor="middle" font-size="13" fill="#7a531a">LaTeX</text>
  <text x="115" y="202" text-anchor="middle" font-size="10.5" fill="#a86">BBT → refs.bib → \cite</text>
  <rect x="225" y="160" width="170" height="56" rx="8" fill="#eef9ef" stroke="#3a8a4a"/>
  <text x="310" y="184" text-anchor="middle" font-size="13" fill="#1f5b2e">Word</text>
  <text x="310" y="202" text-anchor="middle" font-size="10.5" fill="#5a7">Zotero 插件 → CSL</text>
  <rect x="420" y="160" width="170" height="56" rx="8" fill="#f3eefb" stroke="#7b5ea5"/>
  <text x="505" y="184" text-anchor="middle" font-size="13" fill="#4b2f7a">R Markdown / Quarto</text>
  <text x="505" y="202" text-anchor="middle" font-size="10.5" fill="#86a">@citekey + CSL</text>
  <line x1="280" y1="76" x2="130" y2="158" stroke="#666" stroke-width="1.4" marker-end="url(#z)"/>
  <line x1="310" y1="76" x2="310" y2="158" stroke="#666" stroke-width="1.4" marker-end="url(#z)"/>
  <line x1="340" y1="76" x2="490" y2="158" stroke="#666" stroke-width="1.4" marker-end="url(#z)"/>
</svg>

**LaTeX**：靠第三节的 BBT 自动导出 `refs.bib`，正文 `\cite{Acemoglu2001}`。TeXstudio / VS Code（LaTeX Workshop）的补全会读这个 `.bib`，敲 `\cite{` 自动提示。

**Word**：装 Zotero 的 Word 插件（随主程序安装），在文档里 Add/Edit Citation 边写边插；想换引用格式（Chicago author-date → APA → 某期刊专用样式），在文档样式里换一个 **CSL** 样式，全文引用和参考文献列表一键重排——这是 Word 用户最该用 Zotero 的理由。

**R Markdown / Quarto**：YAML 里 `bibliography: refs.bib`，正文 `[@Acemoglu2001]`，再指一个 `csl:` 样式文件，Pandoc 自动排版。和上面 LaTeX 共用同一个 BBT 导出的 `.bib`。

CSL 样式去 [Zotero Style Repository](https://www.zotero.org/styles) 搜期刊名下载，几乎所有主流期刊都有现成的。

## 六、群组库：和合作者共享

合作项目别再互相发 `.bib` 打架。建一个 **Group Library**（zotero.org 网页端建组，邀请合作者），组里所有人看到同一个库，加的文献实时同步。配合 BBT 把组库导出成项目里的 `refs.bib`，多人写同一篇论文时引用永不冲突。

把这套配好之后，文献这条线就彻底自动了：网页一键入库 → BBT 钉死 citekey 并实时同步 `.bib` →[ 论文里 `\cite` ](/research/workflow/reproducible-project)直接引。下一篇接着讲文献的上游——[怎么高效检索和持续追踪新文献](/research/literature/literature-search)，让该进库的东西先被你发现。

