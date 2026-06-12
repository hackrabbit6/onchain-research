# Case study: merging two prototypes into one coherent tool

A short write-up of the engineering decisions behind `onchain-research`, because
the interesting part is not the clustering rules — it is how three overlapping
prototypes were resolved into two clean, non-overlapping repos.

## Background

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

## The problem

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

## Decisions

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

## Result

- One typechecked, tested CLI built from two half-finished prototypes — the merge
  preserved both tools' working features and the existing clustering tests.
- Two non-overlapping crypto repos (`onchain-research` for EVM/BSC, `meme-flow-coach`
  for Solana) with zero duplicated analysis code.
- A repeatable approach: measure overlap with data → pick one runtime after
  verifying compatibility → namespace rather than fuse → delete duplication instead
  of maintaining two copies.

## What I'd do next

Wire the tracker's planned `ingest → normalize → rate → report` loop to a real EVM
provider so wallet tracking graduates from scaffold to working command, mirroring
what the clustering side already does.
