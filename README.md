# onchain-research

Local-first **EVM/BSC** onchain research CLI. One tool, two surfaces that share a
domain model, provider layer, and Markdown output:

1. **Token holder clustering** — top-holder concentration, known-address filtering,
   and rule-based *suspected coordination* clusters with evidence tx hashes.
2. **Wallet tracking** — a chain-neutral ingest → normalize → rate → report loop
   (EVM adapters first) for building a durable research trail on disk.

The tool treats every output as **reviewable evidence, not attribution proof**.
It does not place trades and stores only durable research outputs on disk.

> Solana meme-token research, watchlists, and trade journaling live in the separate
> **meme-flow-coach** project. This repo stays focused on EVM/BSC.

## Requirements

- [Bun](https://bun.sh) 1.3+

```bash
bun install
cp .env.example .env   # all keys optional; blank = offline/fixture mode
```

## Usage

```bash
# ── Token holder clustering (EVM/BSC) ───────────────────────────────
bun run quick -- 0xccfb3e8b1772bd3a9fc62deaf75127adad597777   # quick scan → reports/*.md
bun run src/index.ts scan    --token <addr> --format table     # concentration + clusters
bun run src/index.ts cluster --token <addr>                    # clusters only
bun run src/index.ts wallet  <address>                         # sample one wallet
bun run src/index.ts export  --token <addr> --format md --out reports/token.md

# Live BSC data (recommended free provider):
MORALIS_API_KEY=your_key \
  bun run src/index.ts scan --provider moralis --chain bsc \
  --token <addr> --top 50 --sample 8 --format md --out reports/live.md

# ── Wallet tracking (EVM/BSC) ───────────────────────────────────────
bun run src/index.ts doctor                                    # print resolved config
```

Run `bun run src/index.ts <scan|wallet|...> --help` for the full clustering flag list.

## Sample output

All examples below use the built-in `fixture` provider, so they are fully
reproducible without any API key.

`scan --format table` — concentration plus suspected-coordination clusters:

```text
Token: APPLE (0xccfb3e8b1772bd3a9fc62deaf75127adad597777)
Top holder: 18.00% | Top 5: 59.50% | Top 10: 59.50%

Address        Balance  Holding  Label
-------------  -------  -------  -----
0x1111...1111  180,000  18.00%
0x2222...2222  165,000  16.50%
0x3333...3333  150,000  15.00%
0x4444...4444  60,000   6.00%
0x5555...5555  40,000   4.00%

Cluster    Confidence  Score  Wallets  Evidence
---------  ----------  -----  -------  --------
cluster-1  high        100    3        12

Warning: Cluster output is research evidence, not proof of common control.
Warning: Known CEX, LP, router, burn, or infrastructure addresses were filtered from cluster scoring.
```

`cluster --format md` — each cluster ships its evidence with tx hashes, so the
output reads as a reviewable case file, not a black-box score:

```markdown
### cluster-1

- Confidence: high
- Score: 100
- Wallets: 0x1111…1111, 0x2222…2222, 0x3333…3333

| Rule                | Score | Evidence Tx        | Reason                                    |
|---------------------|------:|--------------------|-------------------------------------------|
| same_funding_source |    40 | 0xfund-a, 0xfund-b | Both wallets were funded by 0xaaaa…aaaa    |
| near_buy_window     |    25 | 0xbuy-a,  0xbuy-b  | Buys happened within 30 minutes           |
| similar_buy_size    |    15 | 0xbuy-a,  0xbuy-b  | Base-asset buy sizes are close            |
| same_router         |    10 | 0xbuy-a,  0xbuy-b  | Both wallets used 0x10ed…024e (PancakeSwap)|

- Warning: Suspected coordination only; not proof of common control.
```

## Architecture

```
src/
  index.ts            Unified CLI dispatcher (routes to the two surfaces)
  cluster/            Token holder clustering (EVM/BSC)
    analysis/         Concentration + rule-based coordination scoring
    providers/        fixture | moralis | etherscan data providers
    output/           table / json / csv / md formatting
    domain/           Holder, WalletSample, AddressCluster, ScanReport types
  tracker/            Wallet tracking (chain-neutral loop, EVM-first)
    analysis/         Wallet signal rating
    chains/           Chain provider adapters (evm)
    ingest/           Normalize provider data into chain-neutral events
    storage/          Local JSONL persistence
    report/           Markdown wallet reviews
    domain/           Chain, wallet, event, signal types
tests/                Clustering rule tests (bun test)
docs/architecture.md  The ingest → normalize → rate → report design
```

### Design principles

- **Local-first** — durable data lives on disk before any hosted service.
- **Evidence ≠ interpretation** — raw samples and tx hashes stay separate from scores.
- **Chain adapters isolated from analysis** — normalize to chain-neutral events first.
- **No trading, no copy-trading** — research only.

## Scope (V1)

- BSC/EVM holder clustering with fixture, Moralis, and Etherscan providers.
- Chain-neutral wallet-tracking scaffold; EVM adapters are the first concrete target.
- JSON, CSV, table, and Markdown outputs.
- No Solana (see meme-flow-coach), realtime monitoring, graph algorithms, or execution.

## Development

```bash
bun run typecheck
bun test
```

> Merged from two earlier prototypes (`cluster_cli` + `local-note`) into one
> coherent EVM/BSC research tool.
