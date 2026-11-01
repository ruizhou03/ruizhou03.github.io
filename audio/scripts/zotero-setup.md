---
title: 从零搭一套 Zotero：文献库、群组库，再和 LaTeX / Word 联动
source: /research/literature/zotero-setup
voice: zircon-ref
---

# 听稿规则：一段一块；## 开头是小节标题；{显示|读法} 屏幕上显示前者、合成时读后者。

## 从零搭一套 Zotero

文献管理软件早就该是研究生的标配，但很多人要么还在文件夹里堆一堆叫 {paper(3)_final.pdf|paper final} 的文件，要么被 EndNote 的体验劝退。我的结论很直接：用 Zotero。免费、开源、社区活跃，浏览器一键抓取，和 LaTeX、Word、R Markdown 都能干净联动。这篇从零搭一套能用一整个博士周期的配置。

## 一、装三个东西

要装的有三样。第一，Zotero 本体，现在是 Zotero 7，界面和性能比老版本好很多。第二，Zotero Connector，装到日常用的浏览器，网页上看到论文时一键入库。第三，强烈建议装 {Better BibTeX|Better Bib Tech} 插件，这是 LaTeX 用户的命根子，下一节专门讲。

注册一个免费账号开同步：元数据无限同步，附件文件免费 {300 MB|三百兆}。文件超了别急着付费，第四节有省钱方案。

## 二、把文献抓进来

把文献抓进来有四种姿势，按顺手程度排。

第一种，网页一键。在期刊页、Google Scholar、{arXiv|archive} 或者 {NBER|N B E R} 的页面，点浏览器里的 Connector 图标，元数据和 PDF 一起进库。这是九成文献的入库方式。

第二种，标识符导入。在 Zotero 顶部点「魔棒」图标，粘贴 {DOI|D O I}、{arXiv|archive} ID 或者 ISBN，它会自动补全元数据。手头只有一个 {DOI|D O I} 的时候最快。

第三种，直接把 PDF 拖进 Zotero，它会尝试反查元数据。成功率要看 PDF 的质量，工作论文经常失败，得手动补。

第四种，从别处导入。从 EndNote 或者 Mendeley 跑路过来的，先导出成 {.ris|R I S} 或者 {.bib|bib} 文件，再在菜单里选 File、Import 导入。

入库之后，花十分钟做两件一劳永逸的事。

第一件，设 PDF 自动重命名。在设置里把附件命名规则设成「作者、年份、标题」，从此本地的文件名都是人能读懂的。

第二件，建文件夹加标签。按项目、而不是按学科建文件夹，比如 job market paper、二审材料；跨项目的主题用标签。一篇文献可以进好几个文件夹，不用复制。

## 三、{Better BibTeX|Better Bib Tech}：LaTeX 用户必装

原生 Zotero 导出 {.bib|bib} 文件的时候，引文键，也就是 citation key，可能会变来变去，论文里的引用就会全部断掉。{Better BibTeX|Better Bib Tech}，简称 {BBT|B B T}，解决两件致命的事。

第一件，稳定、可读的引文键。把格式设成「作者加年份」，像 {Acemoglu2001|Acemoglu 两千零一} 这样的键，生成出来就固定不变。关键操作是：选中条目，右键选 {Pin BibTeX key|Pin Bib Tech key}，把键钉死。之后改标题、改作者，键都不会漂移，已经写进论文的引用永远不会断。

第二件，自动保持 {.bib|bib} 文件和文献库同步。右键文件夹，选 Export Collection，勾上 Keep updated，导出到项目文件夹里。这样，库里每加一篇文献，项目里的 {refs.bib|refs 点 bib} 就自动多一条。

写 LaTeX 的时候照常引用这个 {refs.bib|refs 点 bib}，再也不用手动维护。要在字段里写公式、或者保护大写字母，{BBT|B B T} 也会按规则处理。

## 四、同步与省钱

免费的 {300 MB|三百兆} 附件空间，很快会被 PDF 塞满。有两条路。

想省钱，就用 {WebDAV|Web DAV}，比如坚果云或者自建的网盘来存附件，元数据仍然走 Zotero 官方同步，附件容量不用花钱。设置方法是：设置、同步、文件同步，选 {WebDAV|Web DAV}。

想省事，就直接订 Zotero 的付费存储，全自动多设备同步，适合不想折腾的人。

无论走哪条，都别把整个 Zotero 数据目录塞进 Dropbox 自己同步。多台设备同时写，会把数据库搞坏，这是经典的翻车现场。

## 五、和写作工具联动

这一节的思路可以用一句话概括：Zotero 文献库是唯一的真相来源，再分别接到 LaTeX、Word 和 R Markdown 三种写作工具上。

先说 LaTeX。靠第三节的 {BBT|B B T} 自动导出 {refs.bib|refs 点 bib}，正文里直接引用 {Acemoglu2001|Acemoglu 两千零一} 这样的键。TeXstudio 或者 VS Code 的补全都会读这个 {.bib|bib} 文件，敲出引用命令就会自动提示。

再说 Word。装上 Zotero 的 Word 插件，它随主程序一起安装，在文档里边写边插引用。想换引用格式，比如从芝加哥作者年份格式换成 APA，再换成某个期刊的专用样式，只要在文档里换一个 {CSL|C S L} 样式，全文引用和参考文献列表就一键重排。这是 Word 用户最该用 Zotero 的理由。

最后是 R Markdown 和 Quarto。在文档开头的配置里写上 {refs.bib|refs 点 bib}，正文用「at 加引文键」的写法引用，再指定一个 {CSL|C S L} 样式文件，Pandoc 会自动排版。它和上面的 LaTeX 共用同一个 {BBT|B B T} 导出的 {.bib|bib} 文件。

{CSL|C S L} 样式可以去 Zotero Style Repository 搜期刊名下载，几乎所有主流期刊都有现成的。

## 六、群组库：和合作者共享

合作项目，别再互相发 {.bib|bib} 文件打架了。建一个群组库：在 {zotero.org|zotero 点 org} 网页端建组，邀请合作者，组里所有人看到的是同一个库，加的文献实时同步。再配合 {BBT|B B T} 把群组库导出成项目里的 {refs.bib|refs 点 bib}，多人写同一篇论文，引用永远不会冲突。

把这一套配好之后，文献这条线就彻底自动化了：网页一键入库，{BBT|B B T} 钉死引文键、实时同步 {.bib|bib} 文件，论文里直接引用。下一篇，接着讲文献的上游：怎么高效检索、持续追踪新文献，让该进库的东西先被你发现。
