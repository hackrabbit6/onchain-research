<p align="right">
  <a href="#中文">中文</a> | <a href="#english">English</a>
</p>

# Case study: merging two prototypes into one coherent tool

<a id="中文"></a>

## 中文

一篇关于 `onchain-research` 背后工程决策的简短记录。有意思的不是聚类规则本身,
而是**如何把三个互相重合的原型,收敛成两个干净、互不重叠的仓库**。

### 背景

我手里攒了三个独立的链上研究原型:

- **cluster_cli** —— EVM/BSC 代币**持有人聚类**(Bun,带 fixture/Moralis/Etherscan
  数据源和规则测试)。打磨得不错,但很窄。
- **local-note** —— 多链**钱包追踪**脚手架(Node + tsx)。架构很好
  (chains → ingest → normalize → storage → report),但唯一能跑的分析是 Solana 代币初筛。
- **meme-flow-coach** —— 带交易日志的 Solana meme 研究**网页应用**。

纸面上三个都是"crypto 研究工具",实际上它们的重合让作品集显得冗余。目标是
**一个连贯的故事,而不是三个半成品仓库**。

### 难点

两种不同性质的重合,需要不同的处理:

1. **结构性重合**(cluster_cli ↔ local-note):分层几乎一样 ——
   `domain / analysis / providers / storage / report / cli`。同样的概念,两套代码。
2. **功能性重复**(local-note ↔ meme-flow-coach):两者实现了**同一套** Solana 代币
   "Watch/Test/Avoid" 分析,用的是**同样的**数据源(Dexscreener + GeckoTerminal),
   而 local-note 那版严格来说是更弱的一个。

还有运行时不一致:cluster_cli 是 Bun 原生(`Bun.write`、`bun:test`、无扩展名导入);
local-note 是 Node + tsx(`.ts` 扩展名导入、`node:` API、一个**没用到的** `zod` 依赖)。

### 决策

**先量化,再合并。** 我拉了真实数据(代码行数、测试数、最后修改时间,以及每个工具的
链/数据源关键词图谱),而不是凭感觉判断哪段代码是主干。这立刻暴露出 local-note 的
Solana 代码才是冗余的那个;也发现一开始被归到一起的 `perspective` 其实是实时行情终端,
完全是另一个品类。

**统一到一个运行时。** Bun 能跑 `node:` API、两种导入风格都支持,而 `zod` 经核实是
声明了但从未使用 —— 所以 Bun 可以同时承载两棵代码树,且零行为变化。一个 `tsconfig`,
一个测试运行器。

**合并但不缠绕。** 我没有把两个领域揉进一个模型,而是把它们放进 `src/cluster/` 和
`src/tracker/` 两个命名空间,前面架一个统一分发器(`src/index.ts`)。一个 CLI、两个面、
命令名不冲突(`scan/cluster/wallet` vs `doctor`)。这样既保住了各自的测试,也避免了
"大重写"带来的破坏已有代码的风险。

**靠"按链拆分"消除重复,而不是两个都留。** 诚实的判断是:meme-flow-coach 是更好的
Solana 产品,所以让它**独占** Solana。我把合并后 tracker 里重复的 Solana 分析删掉,
让 `onchain-research` 专注 EVM/BSC。结果是两个价值定位清晰不同的仓库 —— 一个算法向 CLI、
一个产品向网页应用 —— 而不是两个互相竞争。

**全程密钥卫生。** 原来的 `cluster_cli/.env` 里有一把真实的 Moralis key。它从未被提交;
合并版只带 `.env.example` + `.gitignore`,并把 key 迁到本地(被忽略的)`.env` 里,
保住了实时数据能力。

### 结果

- 从两个半成品原型做出一个通过类型检查、有测试的 CLI —— 合并保住了两个工具的可用功能
  和已有的聚类测试。
- 两个互不重叠的 crypto 仓库(`onchain-research` 管 EVM/BSC,`meme-flow-coach` 管 Solana),
  零重复分析代码。
- 一套可复用的方法:用数据量化重合 → 验证兼容后选定一个运行时 → 命名空间隔离而非揉合 →
  删除重复而非维护两份。

### 下一步

把 tracker 里规划好的 `ingest → normalize → rate → report` 闭环接到真实 EVM 数据源,
让钱包追踪从脚手架升级成能用的命令,对齐聚类那一侧已经做到的程度。

---

<a id="english"></a>

## English

A short write-up of the engineering decisions behind `onchain-research`, because
the interesting part is not the clustering rules — it is how three overlapping
prototypes were resolved into two clean, non-overlapping repos.

### Background

I had accumulated three separate onchain-research prototypes:

- **cluster_cli** — EVM/BSC token *holder clustering* (Bun, with fixture/Moralis/
  Etherscan providers and rule tests). Polished but narrow.
- **local-note** — a multi-chain *wallet tracker* scaffold (Node + tsx). Good
  architecture (chains → ingest → normalize → storage → report), but its only
  working analysis was a Solana token first-pass.
- **meme-flow-coach** — a Solana meme research *web app* with a trade journal.

On paper all three were "crypto research tools." In practice they overlapped in
ways that made the portfolio look redundant. The goal was one coherent story, not
three half-finished repos.

### The problem

Two distinct kinds of overlap, which needed different fixes:

1. **Structural overlap** (cluster_cli ↔ local-note). Nearly identical layering —
   `domain / analysis / providers / storage / report / cli`. Same concepts, two
   codebases.
2. **Functional duplication** (local-note ↔ meme-flow-coach). Both implemented the
   *same* Solana token "Watch/Test/Avoid" analysis from the *same* data sources
   (Dexscreener + GeckoTerminal). local-note's version was strictly the weaker one.

Plus a runtime mismatch: cluster_cli was Bun-native (`Bun.write`, `bun:test`,
extensionless imports); local-note was Node + tsx (`.ts` import extensions,
`node:` APIs, an unused `zod` dependency).

### Decisions

**Measure before merging.** I pulled real numbers (LOC, test counts, last-modified,
and a keyword map of each tool's chains/data-sources) instead of guessing which
code was load-bearing. That immediately showed local-note's Solana code was the
redundant one and that `perspective` — initially lumped in — was actually a
real-time market terminal, a different category entirely.

**Standardize on one runtime.** Bun runs `node:` APIs and supports both import
styles, and `zod` turned out to be declared-but-unused — so Bun could host both
trees with no behavioral change. One `tsconfig`, one test runner.

**Merge without entangling.** Rather than fuse the two domains into one model, I
namespaced them under `src/cluster/` and `src/tracker/` behind a single dispatcher
(`src/index.ts`). One CLI, two surfaces, command names that don't collide
(`scan/cluster/wallet` vs `doctor`). This kept each tool's tests valid and avoided
a "big rewrite" that risked breaking working code.

**Resolve the duplication by splitting on chain, not by keeping both.** The honest
call was that meme-flow-coach was the better Solana product, so it *owns* Solana.
I deleted the duplicated Solana analysis out of the merged tracker and refocused
`onchain-research` on EVM/BSC. Result: two repos with clearly different value props
— an algorithmic CLI and a product web app — instead of two that compete.

**Secrets hygiene throughout.** The original `cluster_cli/.env` held a live Moralis
key. It was never committed; the merge ships `.env.example` + `.gitignore`, and the
key was migrated into a local (ignored) `.env` so live-data capability survived.

### Result

- One typechecked, tested CLI built from two half-finished prototypes — the merge
  preserved both tools' working features and the existing clustering tests.
- Two non-overlapping crypto repos (`onchain-research` for EVM/BSC, `meme-flow-coach`
  for Solana) with zero duplicated analysis code.
- A repeatable approach: measure overlap with data → pick one runtime after
  verifying compatibility → namespace rather than fuse → delete duplication instead
  of maintaining two copies.

### What I'd do next

Wire the tracker's planned `ingest → normalize → rate → report` loop to a real EVM
provider so wallet tracking graduates from scaffold to working command, mirroring
what the clustering side already does.
