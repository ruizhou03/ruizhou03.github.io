---
layout: post
title: "git 是怎么让本地、GitHub、多人和“过去”协同起来的？"
main_category: "科研妙招"
sub_category: "科研之问"
date: "2026-05-20"
author: "Zircon"
permalink: "/research/how-it-works/git-workflow"
published: true
keywords: ["git 工作流", "git 原理", "git 是什么", "git 怎么用", "本地和 GitHub 协同", "GitHub 网页和本地", "git push pull", "git 多人协作", "git 团队协作", "git 回到过去版本", "git 回退", "git reset revert 区别", "git checkout 历史", "git 撤销", "git reflog 后悔药", "暂存区 staging index", "工作区 working tree", "commit 快照", "分支 branch", "merge 冲突 conflict", "Pull Request PR", "clone fetch", "版本控制 version control", "git 误删找回", "gti 工作流", "git 怎么协同", "代码版本管理", "回到上一个版本"]
---

# 1. 问题

用 git / GitHub 时，最让人没底的三件事：

- GitHub 网页和我电脑上那个文件夹，是怎么“同步”起来的？
- 多个人改同一个项目，git 是怎么保证大家不互相覆盖的？
- 如果我想回到过去某个版本，真的能回得去吗？

# 2. 结论先行

先把最容易错的心智模型纠正过来：**git 不是网盘，GitHub 不是“云端那个唯一真本”。**

- git 是装在你电脑上的一个**版本数据库**。每次提交（commit）它存一张**完整快照**，并打上不可篡改的 ID，快照串成一条链就是历史。
- GitHub 只是**网上的一份副本（remote）**。你本地有一份完整历史，GitHub 有一份完整历史，两边靠 `push`（我推上去）和 `pull`（我拉下来）同步——没有谁天生是“正本”，是团队**约定**把 GitHub 上的某个分支当公共集合点。
- 多人协同：每人本地一份完整仓库，各开**分支**互不打扰，靠**三方合并**自动拼接不冲突的改动，冲突的地方才叫人来定。git 是“基于共同祖先算差异再拼”，**不是“谁后保存谁覆盖谁”**——这正是它和共享文档的根本区别。
- 回到过去：**能，而且基本丢不了**。每个 commit 都是带唯一 ID 的完整快照，连你“误删”的提交，git 也在 `reflog` 里留着（默认约 90 天）。区别只在于你想用哪种姿势回去。

下面拆开讲。

# 3. 原理：先建立一个不会错的心智模型

git 在你本地把东西分成三段，这是理解一切的地基：

1. **工作区（working tree）**：你正在编辑的那些文件，眼睛看到的。
2. **暂存区（staging / index）**：你用 `git add` 挑出来、准备装进下一次提交的改动。像“打包前先把要寄的东西摆进箱子”。
3. **本地仓库（.git 历史）**：`git commit` 把暂存区封成一张**快照**存进历史。这张快照一旦生成就不可变。

再加上一份在别处的副本——**远程仓库（remote，通常在 GitHub）**——和两个同步动作 `push` / `pull`，整个 git 的世界就这四样东西：

<svg viewBox="0 0 760 300" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;font-family:inherit">
  <style>
    .b{fill:#f4f4f2;stroke:#444;stroke-width:1.5}
    .c{fill:#eaf3f1;stroke:#2e7d6b;stroke-width:1.5}
    .t{font-size:13px;fill:#222;text-anchor:middle}
    .s{font-size:11px;fill:#888;text-anchor:middle}
    .op{font-size:12px;fill:#2e7d6b;text-anchor:middle;font-weight:bold}
    .ar{stroke:#2e7d6b;stroke-width:2;fill:none;marker-end:url(#h)}
    .grp{font-size:12px;fill:#999}
  </style>
  <defs>
    <marker id="h" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#2e7d6b"/>
    </marker>
  </defs>

  <text x="30" y="30" class="grp">— 你的电脑（本地）———————————————————</text>
  <rect x="30"  y="50" width="130" height="60" rx="8" class="b"/>
  <text x="95"  y="76" class="t">工作区</text>
  <text x="95"  y="94" class="s">你在改的文件</text>
  <rect x="240" y="50" width="130" height="60" rx="8" class="b"/>
  <text x="305" y="76" class="t">暂存区</text>
  <text x="305" y="94" class="s">挑出要提交的</text>
  <rect x="450" y="50" width="150" height="60" rx="8" class="b"/>
  <text x="525" y="76" class="t">本地仓库</text>
  <text x="525" y="94" class="s">commit 快照历史</text>

  <line x1="160" y1="80" x2="240" y2="80" class="ar"/>
  <text x="200" y="70" class="op">git add</text>
  <line x1="370" y1="80" x2="450" y2="80" class="ar"/>
  <text x="410" y="70" class="op">git commit</text>

  <rect x="450" y="200" width="150" height="60" rx="8" class="c"/>
  <text x="525" y="226" class="t">GitHub 远程</text>
  <text x="525" y="244" class="s">另一份完整历史</text>

  <line x1="540" y1="110" x2="540" y2="200" class="ar"/>
  <text x="585" y="158" class="op">git push</text>
  <line x1="510" y1="200" x2="510" y2="110" class="ar"/>
  <text x="468" y="158" class="op">git pull</text>
  <text x="30" y="240" class="grp">— 网上 —</text>
</svg>
<p class="img-caption">git 的全部地基：本地三段（工作区→暂存区→仓库）+ 网上一份副本，靠 push/pull 两个动作连起来。后面所有问题都是这张图的推论。</p>

补两个名词，后面要用：

- **commit**：一张快照 + 指向上一个 commit 的“父指针” + 作者/时间/说明，用内容算出一个唯一 ID（一长串十六进制）。commit 一个接一个串起来，就是历史。
- **分支（branch）**：本质只是“**指向某个 commit 的一个可移动标签**”，极其轻量。`HEAD` 是“我现在站在哪个 commit/分支上”。新建分支几乎零成本，所以 git 鼓励你随便开。

## 3.1 GitHub 网页和本地文件夹，怎么协同？

它俩是**同一个仓库的两份拷贝**，各自都有完整历史。所谓“在 GitHub 网页上编辑文件并提交”，本质就是**在远程那一份上做了一个 commit**。

两份拷贝之间，同步动作只有两个方向：

- **本地 → 远程**：`git push`，把你本地新增的 commit 上传。
- **远程 → 本地**：`git fetch`（只下载，不动你的文件）/ `git pull`（下载并合并进你当前分支）。

所以日常就是一个循环：

```
git pull                  # 先拿别人/网页上的最新
# ……改文件……
git add -A                # 把改动放进暂存区
git commit -m "说清楚改了啥"   # 封成一张快照
git push                  # 上传到 GitHub
```

“本地和 GitHub 没同步”从来不是玄学，永远是这个循环里某一步没做：要么忘了 `pull` 就开干，要么 `commit` 了忘了 `push`，要么在 GitHub 网页改了忘了 `pull` 回来。

## 3.2 多人协同，为什么不会互相覆盖？

每个人 `git clone` 拿到的是**整个仓库的完整副本**（不是只下载几个文件，连历史都在本地）。然后：

1. 各自开自己的分支干活（`git switch -c feature-x`），互不干扰。
2. 干完推到远程，开一个 **Pull Request（PR）**，别人 review 之后**合并（merge）**进公共分支（通常叫 `main`）。

合并时 git 做的事叫**三方合并**：找到两个分支的**共同祖先**，对比“祖先 → 你的版本”和“祖先 → 他的版本”各自改了什么：

- 改的是**不同文件 / 同文件不同地方** → git 自动拼好，两边改动都保留。
- 改的是**同一个地方且不一样** → 这才叫**冲突（conflict）**。git 不猜，它在文件里用 `<<<<<<<` / `=======` / `>>>>>>>` 把两份都标出来，**让人来决定**留哪个，解决完再 commit。

这就是和网盘 / 共享文档**最根本的区别**：网盘是“谁后保存覆盖谁”，git 是“基于共同祖先算差异再拼，拼不了才叫人”。所以两个人同时改一个项目，只要不是死磕同一行，git 能把两份工作**都**留下来——这是新手最该建立的那个认知，建立了就不会再怕“他一推会不会把我覆盖了”。

## 3.3 想回到过去某个版本，回得去吗？

回得去。前提只有一个：**你 commit 过**。只要 commit 过，那张快照就带着唯一 ID 永远在那；甚至你以为“弄丢了”的提交（比如手滑 reset 错了、删错了分支），`git reflog` 里都还留着记录（默认约 90 天），能捞回来。git 是出了名地“东西很难真丢”。

“回去”不是一个动作，而是看你**想干嘛**——意图不同，姿势不同：

| 我想干嘛 | 怎么做 | 会发生什么 |
|---|---|---|
| 只想看看那时候的代码长啥样 | `git checkout <commit>`（或在 GitHub 上点开那个 commit） | 临时穿越看一眼，**不改历史**，看完切回来 |
| 想从那个旧状态另起炉灶 | `git switch -c old-state <commit>` | 从旧点新开一条分支，原来的历史**原封不动** |
| 本地还没 push，想真的退回去 | `git reset --hard <commit>` | 当前分支指针挪回那个点，之后的提交从分支上脱钩（但 reflog 还能找回） |
| 已经 push 了 / 想保留历史地撤销某次改动 | `git revert <commit>` | 生成一个“反向 commit”抵消那次改动，历史**只增不改**，最安全 |
| 不小心 reset / 删分支删错了 | `git reflog` 找到 ID，再 `git reset` 或 `git branch` 救回 | git 的“后悔药”——HEAD 每次移动都有记录 |

这里有一个**必须分清**的区别：

- `git reset` 是**改写历史**——把分支指针往回挪，假装后面那些提交没发生过。适合**本地、还没分享给别人**的时候用。
- `git revert` 是**追加历史**——不删任何东西，而是补一个“把那次改动反过来做一遍”的新 commit。适合**已经 push、别人已经基于这段历史在干活**的时候用：因为别人手里是旧历史，你硬改写会和大家打架，而追加一个反向提交对谁都安全。

一句话回答你：能回去，而且基本不会真丢。区别只在于你是想**偷看一眼**、**另开一支**、**把指针挪回去**、还是**补一个反悔提交**。

# 4. 怎么用对它

- **先背这套地基**：三段（工作区/暂存区/仓库）+ 两个同步动作（push/pull）+ 一句话“commit 是不可变快照”。后面所有命令都只是在这套模型上做操作，别去背命令。
- **日常最小循环**：`git pull` → 改 → `git add -A` → `git commit -m "..."` → `git push`。雷打不动。
- **多人**：别直接在 `main` 上写，开分支 + PR；`push` 前先 `pull`（或 `rebase`）一下，把别人的新改动先合进来，冲突在本地解决，远程才干净。
- **怕搞砸**：动手前先 `git status` 和 `git log --oneline --graph` 看清楚自己在哪。要“撤销”优先用 `revert`；本地实验性回退才用 `reset`，并记住 `reflog` 是后悔药。任何危险操作前，`git switch -c backup` 先存一个保险分支，零成本。
- **提交习惯**：小步提交，说明写清楚“为什么改”而不只是“改了啥”。历史是写给**未来的你**和队友看的，写好了，3.3 里那些“回到过去”才用得顺手。

# 5. 想深入

- **《Pro Git》**（git-scm.com/book，官方免费中文版）——尤其第 2、3、7 章和“Git 内部原理”一章，把 commit / 分支 / reset vs revert 讲到根上。
- **Git 官方文档**（git-scm.com/docs）——命令查得到、说得准的地方。
- **GitHub Docs 的协作流章节**——Pull Request、review、保护分支这套团队约定怎么落地。
- **`git help <命令>`**——本地就能查，比搜来的二手解释靠谱。
