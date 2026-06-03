# 项目级指示（强制遵守）

## Git 提交边界

**Agent 只能 commit 自己这一轮亲手改的文件，绝不能把别人 / 其他会话正在做的改动一起提交。**

本仓库经常有多个会话 / agent 并发在做不同工具，工作区里随时可能存在不属于你本次任务的改动（已 staged 的、未 staged 的、未跟踪的）。每次提交前必须：

1. 先 `git status` 看清楚工作区里都有什么。
2. **只** `git add <你这次明确改过的具体文件路径>` —— **禁止 `git add -A` / `git add .` / `git add <整个目录>`**。
3. 若发现有不是你这次动的改动（**包括已经 staged 的**），不要顺手一起提交、不要 stash 掉、不要 checkout 回退、不要替别人合并冲突——**先停下来告诉用户，问清楚怎么处理**。
4. commit message 只描述你自己这次的改动。
5. push 前若被拒（non-fast-forward），说明远端有别人的提交：先判断清楚再决定怎么集成，能只推自己这条就用隔离手段（如临时 `git worktree` cherry-pick 自己的提交），不要盲目 rebase/merge 卷进别人的在做工作。

**为什么**：2026-06-01 出过两次事故——一次 `git add -A` 把另一会话的 bazi/dare/sim-*.js 误并进 pet 提交并部署；一次 commit 又卷入别人 pre-staged 的 guandan 改动。并发写入下混提会污染历史、可能提前部署别人没写完的东西、并制造 rebase 冲突。

**唯一例外**：用户明确说「把工作区所有改动都提交 / push」时可以整合，但 commit message 要写明「这是按用户要求整合并发遗留 WIP、非本会话所写」。

## 分支与部署模型（强制遵守）

**默认在 `main` 上干活，push 到 `main` 就是部署。** GitHub Pages 只构建 `main` 分支（旧版构建，绑定 ruizhou03.com）；其它分支对线上完全不可见，要让任何东西上线都必须弄到 `main`。这是单人个人站，采用**主干开发**——每个会话 / agent 默认直接在 `main` 上做、push 到 `main`。并发安全靠「各管各的文件」（文件级隔离）+ 上面《Git 提交边界》那套，**不靠开分支**。

1. **不想立刻上线的半成品，用内容 / 功能开关挡，不要用长命分支挡。** 文章用 `published: false`；功能用 `noindex` + 不在导航挂入口 + 功能 flag。东西可以躺在 `main` 上而不暴露给线上。
2. **需要隔离时（高风险大改 / 想本地多开），用 `git worktree` 开短命分支，同一会话内合回 `main`。** 用真合并（`git merge`，必要时 `--no-ff`），合完**立刻删分支 + 撤 worktree**。分支不过夜。
3. **铁律：绝不把一个分支的改动「重新敲一遍 / cherry-pick / squash 重提交」到 `main`——永远真合并。** 在 `main` 上重抄同一个改动会制造「同内容、不同 SHA」的提交，让今后每次合并都在相同几行上重复冲突。
4. **任务一落 `main` 立即删掉对应分支**，别让分支累积分叉。长命 feature 分支是分叉与冲突的蓄水池。
5. **发现自己正处在一个落后于 `main` 的老分支上时**：不要整条 merge 回去（会把 `main` 的新东西回退掉），也不要逐条 cherry-pick（大概率 `main` 已用别的 SHA 重做过、只会重复冲突）。正确做法是先做内容比对（`git diff main..<branch>`，按 merge-base 把每个文件分成 AHEAD / 两边都改 / 落后三类）找出 **`main` 真正还缺的那几处**，只把这几处摘成一个干净小提交落 `main`，然后删掉老分支。

**实操：工作区是脏的（有别的会话未提交的 WIP）又要往 `main` 落一条提交时**——别在当前脏工作区里切分支 / stash / 还原。开一个隔离 worktree：`git worktree add -B tmp /tmp/land origin/main`，进去只改你那一两个文件、`git add <具体文件>`、commit，`git fetch origin main` 后把自己这条 rebase 上去，再 `git push origin HEAD:main`，最后 `git worktree remove /tmp/land`。全程不碰别人的脏工作区。

**为什么**：2026-06 引入过 feature/paywall、feature/feixingqi-ui、feature/tiaoqi-ui、hotfix-* 一堆长命分支，又用「重抄到 main」代替合并，结果分支与 `main` 各有一份「同内容不同 SHA」的提交，每次合并都重复冲突、agent 频繁停下请示。回到主干开发后这些都不再发生。
