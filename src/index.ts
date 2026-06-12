#!/usr/bin/env bun
import { looksLikeEvmAddress } from "./cluster/cli/args";
import { runCluster } from "./cluster/run";
import { runTracker } from "./tracker/cli/run";

const CLUSTER_COMMANDS = new Set(["scan", "cluster", "wallet", "export"]);
const TRACKER_COMMANDS = new Set(["doctor"]);

function topHelp(): string {
  return `onchain-research — local-first EVM/BSC research CLI

Cluster output and ratings are reviewable evidence, not attribution proof.

Token holder clustering (EVM/BSC):
  onchain-research <token_address>          Quick scan, save a Markdown report
  onchain-research scan    --token <addr>   Concentration + suspected coordination clusters
  onchain-research cluster --token <addr>   Clusters only (skip the holder table)
  onchain-research wallet  <address>        Sample one wallet's funding / buys / sells
  onchain-research export   --token <addr>  Write json|csv|md to --out

Wallet tracking (EVM/BSC):
  onchain-research doctor                   Print resolved local configuration
  (chain-neutral ingest → normalize → rate → report loop; EVM adapters first)

Run a subcommand with --help (clustering) for its full flag list.
Solana meme research and trade journaling live in the meme-flow-coach project.
`;
}

async function main(argv: string[]): Promise<void> {
  const command = argv[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(topHelp());
    return;
  }

  // EVM address shorthand and the clustering verbs go to the cluster tool.
  if (looksLikeEvmAddress(command) || CLUSTER_COMMANDS.has(command)) {
    await runCluster(argv);
    return;
  }

  if (TRACKER_COMMANDS.has(command)) {
    await runTracker(argv);
    return;
  }

  process.stderr.write(`Unknown command: ${command}\n\n${topHelp()}`);
  process.exitCode = 1;
}

main(Bun.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
