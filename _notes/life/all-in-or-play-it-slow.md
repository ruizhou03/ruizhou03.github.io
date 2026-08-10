---
layout: post
title: "一次梭哈，还是慢慢赌？"
keywords: ["一次梭哈还是慢慢赌", "梭哈", "all in", "慢慢下注", "赌博策略", "赌徒破产", "gambler's ruin", "马尔可夫链", "Markov chain", "吸收马尔可夫链", "absorbing Markov chain", "吸收概率", "到达概率", "hitting probability", "前向方程", "forward equation", "后向方程", "backward equation", "平稳分布", "stationary distribution", "极限分布", "limiting distribution", "概率流", "下注策略"]
description: "你只有 2 美元，却欠着 4 美元。一次梭哈，还是每次只押 1 美元，更容易在归零以前凑到 4 美元？"
date: 2026-08-09
author: "Zircon"
main_category: "生活攻略"
sub_category: "生活之问"
permalink: "/life/all-in-or-play-it-slow"
image: "/assets/social/all-in-or-play-it-slow-cover.png"
published: true
---

<link rel="stylesheet" href="/assets/css/all-in-or-play-it-slow.css">

你走进赌场时，身上只有 2 美元，却有一笔 4 美元的债要还。要还清它，你必须在钱归零以前，把手里的 2 美元变成 4 美元。

赌桌上的每一局只有两种结果：以概率 $p$ **成功**，以概率 $q$ **失败**，其中

$$
q:=1-p.
$$

各局彼此独立；前面赢了还是输了，都不会改变下一局的成功概率。

每一局开始前，你可以决定押多少钱。假如手里有 $s$ 美元，这一局押 $x$ 美元：成功后净赚 $x$，手里的钱变成 $s+x$；失败后损失 $x$，变成 $s-x$。

# 1. 赌桌前的两种选择

站在桌前，你有两种选择：

- **一次梭哈：**把 2 美元全部押上。成功便直接从 2 变成 4；失败则直接从 2 变成 0。
- **慢慢赌：**每次只押 1 美元。成功一次，财富增加 1；失败一次，财富减少 1；一直进行到财富达到 4 或归零。

一次梭哈只需要成功一局，却没有第二次机会；慢慢赌保留了翻身空间，却也可能让自己经历更多局。

到底哪一种方式更容易让你还上这笔债？先不要急着猜答案，我们先把钱会怎样移动画出来。

<figure class="ais-routes" aria-labelledby="ais-routes-caption">
  <figcaption id="ais-routes-caption">
    <strong>同一个目标，两种走法</strong>
    <span>一次梭哈一局决定结果；慢慢赌每局只移动 1 美元。</span>
  </figcaption>
  <div class="ais-route-grid">
    <div class="ais-route-panel">
      <div class="ais-route-title">
        <span>A</span>
        <strong>一次梭哈</strong>
        <small>下注 2 美元</small>
      </div>
      <div class="ais-route-body">
        <div class="ais-money-node ais-money-start"><b>2</b><small>起点</small></div>
        <div class="ais-route-branches">
          <div class="ais-route-branch ais-route-win">
            <span>成功 · p</span><b aria-hidden="true">→</b>
            <div class="ais-money-node ais-money-goal"><strong>4</strong><small>达到目标</small></div>
          </div>
          <div class="ais-route-branch ais-route-loss">
            <span>失败 · q</span><b aria-hidden="true">→</b>
            <div class="ais-money-node ais-money-zero"><strong>0</strong><small>游戏结束</small></div>
          </div>
        </div>
      </div>
    </div>
    <div class="ais-route-panel">
      <div class="ais-route-title">
        <span>B</span>
        <strong>慢慢赌</strong>
        <small>每次下注 1 美元</small>
      </div>
      <div class="ais-route-body">
        <div class="ais-money-node ais-money-start"><b>2</b><small>起点</small></div>
        <div class="ais-route-branches">
          <div class="ais-route-branch ais-route-win">
            <span>成功 · p</span><b aria-hidden="true">→</b>
            <div class="ais-money-node"><strong>3</strong><small>继续下注</small></div>
          </div>
          <div class="ais-route-branch ais-route-loss">
            <span>失败 · q</span><b aria-hidden="true">→</b>
            <div class="ais-money-node"><strong>1</strong><small>继续下注</small></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</figure>

一次梭哈只进行一局，因此它的成功概率立刻就是

$$
\pi_A=p.
$$

真正需要想一想的是慢慢赌。在这个策略下，财富只可能是 $0,1,2,3,4$。只要还在 $1,2,3$，成功就向右移动一格，失败就向左移动一格；到了 0 或 4，游戏结束：

$$
0\longleftarrow1\longleftrightarrow2\longleftrightarrow3\longrightarrow4.
$$

我们从 2 出发。记第 $t$ 局结束后的财富为 $S_t$，只要游戏还没有结束，就有

$$
S_{t+1}
=
\begin{cases}
S_t+1,&\text{概率 }p,\\
S_t-1,&\text{概率 }q.
\end{cases}
$$

这张图告诉我们下一局会去哪里，却没有直接告诉我们最后会到达哪一端。慢慢赌可能来回很多次；如果逐条列举所有输赢路径，很快会得到一棵不断分叉、甚至无限延伸的路径树。

但我们其实不需要记住完整路径。

# 2. 如果此刻有 $s$ 美元呢？

先把游戏暂停在某个尚未结束的时刻。假设此刻手里有 $s$ 美元，从现在开始，最终先凑到 4 美元的概率有多大？

把这个概率记作

$$
h(s)
:=
\Pr(\text{先到达 }4\text{ 而不是 }0\mid \text{当前有 }s\text{ 美元}).
$$

这里把起点从 2 放宽到 $s$，不是因为题目变了，而是因为下一局以后，我们可能来到 1、2、3 中的另一个位置。只有同时知道从这些位置出发时各自的成功机会，才能把它们联系起来。

如果已经归零，当然不可能成功；如果已经有 4 美元，目标已经实现。因此

$$
h(0)=0,
\qquad
h(4)=1.
$$

现在分别看手里有 1、2、3 美元的情形。

从 1 美元出发，下一局成功就到 2，失败就到 0，所以

$$
h(1)=p\,h(2).
$$

从 3 美元出发，下一局只要成功就已经到达目标；失败则回到 2，因此

$$
h(3)=p+q\,h(2).
$$

从真正的起点 2 美元出发，下一局成功到 3，失败到 1：

$$
h(2)=p\,h(3)+q\,h(1).
$$

把前两式代入第三式：

$$
\begin{aligned}
h(2)
&=p\bigl(p+q\,h(2)\bigr)+q\bigl(p\,h(2)\bigr)\\
&=p^2+2pq\,h(2).
\end{aligned}
$$

因为

$$
1-2pq=p^2+q^2,
$$

所以慢慢赌的成功概率是

$$
\pi_B=h(2)=\frac{p^2}{p^2+q^2}.
$$

到这里，问题其实已经解完了。整个推导没有记录游戏进行了多少局，也没有记住过去经历了怎样的输赢；一旦知道当前有多少钱，未来的计算就只取决于当前位置。

可是，很多人看到前面的状态图时，最自然的念头并不是“换一个假想起点”，而是逐局追踪：第一局以后钱在哪里？第二局以后呢？这些概率最后怎样进入 0 和 4？

这条路也完全走得通。

# 3. 如果坚持逐轮追踪呢？

想象有很多人都从 2 美元出发，并且都采用慢慢赌。

第一局以后，大约有比例 $p$ 的人来到 3 美元，比例 $q$ 的人来到 1 美元。第二局以后，比例 $p^2$ 的人已经到达 4，比例 $q^2$ 的人已经归零，还有比例 ${2pq}$ 的人重新回到 2。

现在，把第 $t$ 局后处在 $j$ 美元的人所占的比例记作

$$
P_j(t)
:=
\Pr(S_t=j\mid S_0=2),
\qquad j=0,1,2,3,4.
$$

换句话说，$P_j(t)$ 回答的是：**从 2 美元出发，经过 $t$ 局以后，手里有 $j$ 美元的概率是多少？**

初始条件为

$$
P_2(0)=1,
\qquad
P_0(0)=P_1(0)=P_3(0)=P_4(0)=0.
$$

沿着前面图中的箭头逐轮搬运这些比例，就得到

$$
P_0(t+1)=P_0(t)+qP_1(t),
$$

$$
P_1(t+1)=qP_2(t),
$$

$$
P_2(t+1)=pP_1(t)+qP_3(t),
$$

$$
P_3(t+1)=pP_2(t),
$$

$$
P_4(t+1)=P_4(t)+pP_3(t).
$$

逐个求出 $P_j(t)$ 的显式表达式当然可以，却会很繁琐。真正需要的，是各个中间位置在整个过程中累计承载了多少概率。定义

$$
A_j
:=
\sum_{t=0}^{\infty}P_j(t),
\qquad j=1,2,3.
$$

$A_j$ 可以理解为：从 2 美元出发，到游戏结束以前，处于 $j$ 美元的期望总次数。

由

$$
P_1(t+1)=qP_2(t)
$$

对所有 $t\geq0$ 求和。因为 $P_1(0)=0$，得到

$$
A_1=qA_2.
$$

同理由

$$
P_3(t+1)=pP_2(t)
$$

得到

$$
A_3=pA_2.
$$

再看状态 2：

$$
P_2(t+1)=pP_1(t)+qP_3(t).
$$

对 $t\geq0$ 求和时，左边是 $A_2-P_2(0)=A_2-1$，因此

$$
A_2-1=pA_1+qA_3.
$$

代入 $A_1=qA_2$ 和 $A_3=pA_2$：

$$
A_2-1
=
pqA_2+qpA_2
=
2pqA_2.
$$

所以

$$
A_2
=
\frac{1}{1-2pq}
=
\frac{1}{p^2+q^2},
$$

进而

$$
A_3
=
pA_2
=
\frac{p}{p^2+q^2}.
$$

现在只需计算流入成功状态 4 的总概率。由

$$
P_4(t+1)-P_4(t)=pP_3(t),
$$

可知每一局新进入 4 美元的概率，等于“当前处在 3 美元”的概率乘以下一局成功的概率。

把它从 $t=0$ 加到无穷，左边的中间项会前后抵消：

$$
\begin{aligned}
\pi_B
&=
\lim_{t\to\infty}P_4(t)\\
&=
p\sum_{t=0}^{\infty}P_3(t)\\
&=
pA_3\\
&=
\frac{p^2}{p^2+q^2}.
\end{aligned}
$$

沿着一条完全不同的路线，我们又得到了同一个答案。

还有一个对称的核对：流进失败状态 0 的总概率是

$$
qA_1
=
\frac{q^2}{p^2+q^2}.
$$

成功概率与失败概率相加，恰好等于 1。

# 4. 到这里，再给两种问法起名字

直到这里，我们都没有必要先懂任何专业名词。现在回头看，前面的五个财富位置以及它们之间的移动，构成了一条有限状态的 **Markov chain**。我们只是用两种问法读了同一张图。

第一种固定“最终能否成功”这个事件，改变当前所在的位置；第二种固定真正的起点 2，让时间向前推进。数学上，前者通常称为 **backward 视角**，后者称为 **forward 视角**。

|  | Backward | Forward |
|---|---|---|
| 未知量 | $h(s)=\Pr(\text{最终成功}\mid S_0=s)$ | $P_j(t)=\Pr(S_t=j\mid S_0=2)$ |
| 固定什么 | 固定最终事件 | 固定初始分布 |
| 改变什么 | 改变起始状态 $s$ | 让时间 $t$ 向前走 |
| 直觉 | 把边界上的价值递推回现在 | 把起点的概率质量推向未来 |
| 适合回答 | 最终是否到达某个边界 | 各期分布、访问次数、吸收时间 |

可以把两者记成一句话：

> **Backward 把终点的价值带回现在；forward 把起点的概率推向未来。**

这里的 “backward” 并不是让随机过程倒着运行，也不是 time reversal。它只是说：我们利用未来结果的边界值，反过来计算当前状态的价值。

Forward 方法虽然先保留了时间，但最后把每一局处在某个位置的概率加总起来：

$$
P_j(t)
\longrightarrow
A_j=\sum_tP_j(t)
$$

把时间维度重新压缩掉了。

如果只关心最终是否到达某个边界，backward 方法通常更短；如果还关心每个时点的分布、各状态的访问次数或吸收时间，forward 方法会保留更多动态信息。

# 5. 一个看似自然、却不够用的捷径

学过一点 Markov chain 的读者可能会问：既然我们关心“很久以后”，能不能直接寻找一个不再变化的概率分布？

问题在于，100% 停在 0 不会再动，100% 停在 4 也不会再动；30% 停在 0、70% 停在 4，同样不会再动。数学上，这些都叫平稳分布（stationary distributions）。

这道题不是没有平稳分布，而是它有无穷多个。对任意 $\alpha\in[0,1]$，

$$
\nu_\alpha
=
(\alpha,0,0,0,1-\alpha)
$$

都是 stationary distribution。

只要概率质量已经全部停在两个吸收状态上，之后就不会再变化。但“不会再变化”并不等于“告诉我们从 2 美元出发会形成哪一种混合”。

stationary equation

$$
\nu=\nu P
$$

没有包含初始条件 $S_0=2$，因此无法替我们选出正确的 $\alpha$。

这里必须区分两个问题：

- **stationary distribution** 问：“把这个分布放进链里，它会不会继续变化？”
- **limiting distribution** 问：“从一个指定起点出发，长期实际会趋近哪一个分布？”

从状态 2 出发，真正的极限分布是

$$
\lim_{t\to\infty}\mathcal L(S_t)
=
\left(
\frac{q^2}{p^2+q^2},
0,
0,
0,
\frac{p^2}{p^2+q^2}
\right).
$$

它当然也是某一个 stationary distribution；但两个终点之间的权重，必须通过前面算出的到达概率或逐轮概率流求出来，不能只靠 stationarity。

换句话说，到长期时，每一期新流入吸收态的概率都已经趋近于零；可是最终吸收概率来自此前所有流量的累计。只看最后“不再流动”的那一刻，会把整个历史丢掉。

# 6. 到底应该梭哈，还是慢慢赌？

现在比较两种策略：

$$
\pi_A=p,
$$

$$
\pi_B
=
\frac{p^2}{p^2+q^2}.
$$

两者之差为

$$
\pi_B-\pi_A
=
\frac{p(1-p)(2p-1)}{p^2+(1-p)^2}.
$$

因此：

- $p=0$：两种策略的成功率都是 0；
- ${0<p<1/2}$：$\pi_B<\pi_A$，**一次梭哈严格更好**；
- $p=1/2$：$\pi_B=\pi_A=1/2$，**两种策略一样**；
- ${1/2<p<1}$：$\pi_B>\pi_A$，**慢慢赌严格更好**；
- $p=1$：两种策略的成功率都是 1。

这里的“更好”只表示**先到达 4 的概率更高**。如果加入时间成本、效用、风险偏好或其他下注限制，结论可能不同。

事实上，一次梭哈一局结束；慢慢赌的期望局数为

$$
\mathbb E[T]
=
A_1+A_2+A_3
=
\frac{2}{p^2+q^2},
$$

它在 2 局到 4 局之间。

# 7. 最后一个直觉：两局以后，要么结束，要么重来

从 2 美元出发，把下注按两局分组，会出现三种结果：

- $WW$：到达 4，概率为 $p^2$；
- $LL$：到达 0，概率为 $q^2$；
- $WL$ 或 $LW$：回到 2，概率为 ${2pq}$，一切重来。

所以，第一个“有决定性的两局区块”是 $WW$ 的条件概率为

$$
\frac{p^2}{p^2+q^2}.
$$

这不是说策略 B 必须一开始连续赢两局。它可以先经历任意多个一胜一负的区块；关键是这些混合结果都会把我们送回原点。最终真正决定结果的区块，不是两连胜，就是两连败。

因此，成功与失败的赔率满足

$$
\frac{\Pr(\text{成功})}{\Pr(\text{失败})}
=
\left(\frac{p}{q}\right)^2.
$$

当 $p<1/2$ 时，失败区块比成功区块更常见。每多赌一局，都意味着多暴露一次在负优势之下；既然游戏对你不利，拖得越久未必越安全。

当 $p>1/2$ 时，情况反过来。慢慢下注让正优势有更多机会发挥作用，而且一次偶然失利不会立刻让你归零。

当 $p=1/2$ 时，财富过程是一个公平的 martingale。初始财富 2 对应目标 4，所以成功概率正好是 ${2/4=1/2}$。公平游戏里，改变下注路径不会凭空创造成功概率。

# 8. 真正值得记住的，不只是公式

这道题的答案并不复杂：

$$
\pi_B
=
\frac{p^2}{p^2+(1-p)^2}.
$$

但比答案更值得品味的，是我们究竟把什么选作未知量。

你可以问：**从每一个状态出发，最终成功的概率是多少？**这会带来 backward equation。

你也可以问：**从一个确定的起点出发，每一时刻的概率质量在哪里？**这会带来 forward equation，以及对 probability flow 的累计。

前一种方法直接，后一种方法保留过程。它们不是两套互相竞争的技巧，而是同一条 Markov chain 的两面。

至于标题里的问题——一次梭哈，还是慢慢赌？

策略上的答案取决于 $p$。

解题时选择向后看，还是向前走，则取决于你真正想知道什么。
