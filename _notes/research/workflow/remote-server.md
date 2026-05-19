---
layout: post
title: "远程服务器跑回归：ssh + tmux + SLURM 入门"
main_category: "科研妙招"
sub_category: "科研工作流"
date: "2026-05-20"
author: "Zircon"
permalink: "/research/workflow/remote-server"
published: true
keywords: ["远程服务器", "服务器跑代码", "跑回归 服务器", "HPC 集群", "高性能计算", "ssh 教程", "ssh 连服务器", "ssh 密钥 免密", "ssh-keygen ssh-copy-id", "ssh config 别名", "跳板机 jump host", "VS Code Remote SSH", "scp rsync 传文件", "rsync 同步", "tmux 教程", "tmux 断开重连", "screen", "nohup 后台运行", "断网 任务中断", "SLURM 入门", "sbatch 提交作业", "srun 交互", "squeue scancel sacct", "登录节点 计算节点", "module load R Stata", "作业数组 array job", "蒙特卡洛 并行", "bootstrap 并行", "scratch 目录", "服务器跑 R", "Stata batch", "yuancheng fuwuqi", "怎么用学校服务器", "代码跑太慢"]
---

{% raw %}

到了博士阶段，迟早会遇到笔记本扛不动的活：几千万行的行政数据、要跑一晚上的蒙特卡洛、上百个设定的稳健性。这时候该上学校 / 院里的服务器或 HPC 集群了。门槛听起来吓人，其实就三件套：**ssh 连上去、tmux 让任务断网也不死、SLURM 排队调度**。这篇按这个顺序讲到能独立把一个回归脚本扔上去跑。

## 一、ssh：连上去

最基本一句：

```bash
ssh zircon@cluster.psu.edu
```

每次输密码很烦，配**密钥免密**，一劳永逸（本地跑一次）：

```bash
ssh-keygen -t ed25519              # 一路回车，生成密钥对
ssh-copy-id zircon@cluster.psu.edu # 把公钥装到服务器
```

再配一个 `~/.ssh/config` 别名，从此 `ssh psu` 就连上，还能自动走跳板机：

```
Host psu
    HostName  cluster.psu.edu
    User      zircon
    # 如果要先过一道跳板/堡垒机：
    ProxyJump bastion.psu.edu
    ServerAliveInterval 60        # 防止空闲被踢
```

不想在终端里敲代码：装 **VS Code 的 Remote-SSH 扩展**，直接在本地编辑器里打开服务器上的文件夹，体验和本地几乎一样——写脚本调试很舒服，但**真正的大作业还是要走下面的 tmux / SLURM**，不能靠 VS Code 窗口一直开着。

## 二、传文件：rsync 比 scp 好用

小文件 `scp local.R psu:~/proj/` 够用。同步整个项目用 `rsync`，它只传变化的部分，还能排除不该上传的大数据：

```bash
rsync -avz --exclude 'data/raw/' --exclude '.git/' \
      ./my-paper/  psu:~/my-paper/
```

原则和[可复现项目](/research/workflow/reproducible-project)一致：**代码尽量上传，原始大数据通常已经在集群的共享存储上，别从笔记本来回搬几十 GB**。结果跑完用 `rsync` 反向拉回本地写论文。

## 三、tmux：断网任务也不死

新手最痛的一课：`ssh` 连着直接 `Rscript big.R`，跑了俩小时，网一抖、笔记本一合盖——**任务全没了，从头再来**。

原因是任务挂在这次 ssh 会话下，会话断它就被杀。解法是把任务放进 **tmux**：一个活在服务器上、和你的连接解耦的终端，断开重连它还在。

```bash
ssh psu
tmux new -s reg          # 建一个叫 reg 的会话
Rscript code/run_all.R   # 在里面跑你的活
# 按 Ctrl-b 然后按 d  →  detach，任务继续在服务器上跑
exit                     # 笔记本可以关了、回家路上断网都没事
```

回来要看进度：

```bash
ssh psu
tmux attach -t reg       # 重新接回，输出还在那
tmux ls                  # 忘了叫啥？列出所有会话
```

记三个键就够用：`Ctrl-b d` 脱离、`Ctrl-b c` 新开窗口、`Ctrl-b "` 上下分屏（一个跑任务一个看 `htop`）。`screen` 是同类老牌工具，思路一样。只想后台挂个不交互的脚本、不需要回看终端，`nohup Rscript run_all.R > log.txt 2>&1 &` 更轻便——但有正经调度系统时，请走下面的 SLURM。

## 四、SLURM：别在登录节点上跑回归

集群和单台服务器最大的区别：你 ssh 进去落在**登录节点（login node）**，它是大家共用来编辑代码、提交作业的，**不是用来跑计算的**。在登录节点直接跑大回归会拖垮所有人，管理员会找你——这是新人头号禁忌。

正确姿势：写一个 SLURM 脚本，向**计算节点**申请资源、排队执行。

<svg viewBox="0 0 600 150" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:600px;display:block;margin:1.4rem auto;font-family:sans-serif;">
  <defs><marker id="r" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#666"/></marker></defs>
  <rect x="15" y="50" width="105" height="50" rx="6" fill="#eef3fb" stroke="#3b6ea5"/>
  <text x="67" y="72" text-anchor="middle" font-size="12" fill="#1f3b5b">你的笔记本</text>
  <text x="67" y="89" text-anchor="middle" font-size="10" fill="#5a7">ssh</text>
  <rect x="170" y="50" width="115" height="50" rx="6" fill="#fdf3e7" stroke="#b07b2f"/>
  <text x="227" y="70" text-anchor="middle" font-size="12" fill="#7a531a">登录节点</text>
  <text x="227" y="87" text-anchor="middle" font-size="10" fill="#a86">只编辑/提交</text>
  <rect x="335" y="50" width="105" height="50" rx="6" fill="#f3eefb" stroke="#7b5ea5"/>
  <text x="387" y="70" text-anchor="middle" font-size="12" fill="#4b2f7a">SLURM</text>
  <text x="387" y="87" text-anchor="middle" font-size="10" fill="#86a">排队调度</text>
  <rect x="490" y="35" width="100" height="35" rx="6" fill="#eef9ef" stroke="#3a8a4a"/>
  <rect x="490" y="80" width="100" height="35" rx="6" fill="#eef9ef" stroke="#3a8a4a"/>
  <text x="540" y="57" text-anchor="middle" font-size="11" fill="#1f5b2e">计算节点</text>
  <text x="540" y="102" text-anchor="middle" font-size="11" fill="#1f5b2e">计算节点</text>
  <line x1="120" y1="75" x2="166" y2="75" stroke="#666" stroke-width="1.4" marker-end="url(#r)"/>
  <line x1="285" y1="75" x2="331" y2="75" stroke="#666" stroke-width="1.4" marker-end="url(#r)"/>
  <line x1="440" y1="68" x2="486" y2="55" stroke="#666" stroke-width="1.4" marker-end="url(#r)"/>
  <line x1="440" y1="82" x2="486" y2="95" stroke="#666" stroke-width="1.4" marker-end="url(#r)"/>
</svg>

一个最小作业脚本 `run.slurm`：

```bash
#!/bin/bash
#SBATCH --job-name=reg
#SBATCH --time=02:00:00          # 预估上限，超了会被杀，别报太小
#SBATCH --mem=16G                # 内存
#SBATCH --cpus-per-task=4        # 核数（要和代码里的并行数对上）
#SBATCH --output=logs/reg_%j.out # %j = 作业号

module load r/4.4.1              # 用集群提供的软件环境
Rscript code/run_all.R
```

提交和管理：

```bash
sbatch run.slurm        # 提交，返回一个 job id
squeue -u zircon        # 看自己的作业排队 / 运行状态
scancel 1234567         # 撤掉作业
sacct -j 1234567        # 跑完查实际用了多少内存/时间（用来校准下次申请）
```

要交互式调试（在计算节点开一个临时 shell，而不是登录节点）：

```bash
srun --pty --time=01:00:00 --mem=8G bash
```

Stata 同理，作业脚本里 `module load stata` 然后 `stata -b do code/master.do`。

## 五、把“很多个设定”并行成数组作业

经济学里大量重复计算——蒙特卡洛、几百个设定的稳健性、bootstrap——是天然可并行的。别写一个串行循环跑一整天，用 **SLURM array job**：同一脚本派发 N 个任务，每个跑一份，集群同时调度：

```bash
#SBATCH --array=1-200            # 跑 200 个并行任务
Rscript code/one_spec.R $SLURM_ARRAY_TASK_ID
```

`one_spec.R` 里读 `commandArgs()` 拿到任务号（1…200），各跑一个设定 / 一次重抽样，结果各写一个文件，最后再汇总。本来一天的活，可能十几分钟出齐。单脚本内部并行则用 R 的 `future`/`furrr`/`foreach`，核数和 `--cpus-per-task` 对齐就行。

## 六、几条让你不挨骂的纪律

- **永远不在登录节点跑计算**——小测试也用 `srun` 进计算节点；
- **资源按需申请**：报 `--mem=256G --time=7-00:00` 然后只用 4G 跑十分钟，会一直排不上队还占着配额。先小样本试跑，`sacct` 看实际用量再校准；
- **大中间文件写 `scratch/`**，不要堆在有配额的 `home/`（家目录配额满了一切作业都崩）；
- **每个集群都有自己的文档**：partition 名、模块名、scratch 路径各家不同——第一件事是读你们集群的 quickstart，本文给的是放之四海皆准的骨架。

把这套和[可复现项目结构](/research/workflow/reproducible-project)、[ Git ](/research/workflow/git-for-papers)接起来：本地 `git push`、服务器 `git pull` 同步代码，重活扔给 SLURM，结果 `rsync` 拉回本地[出表出图](/research/econometrics/regression-tables)写论文——笔记本从此只负责写字，算力交给服务器。

{% endraw %}
