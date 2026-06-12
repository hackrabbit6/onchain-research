export function clusterHelpText(): string {
  return `onchain-research — token holder clustering (EVM/BSC)

Usage:
  onchain-research <token_address>
  onchain-research scan --chain bsc --token <address> [--provider fixture|moralis|etherscan] [--top 50] [--sample 8] [--format table|json|csv|md] [--out file]
  onchain-research wallet <address> [--chain bsc] [--provider fixture|moralis|etherscan] [--token <address>] [--format table|json|csv|md] [--out file]
  onchain-research cluster --token <address> [--chain bsc] [--provider fixture|moralis|etherscan] [--top 50] [--sample 8] [--format table|json|csv|md] [--out file]
  onchain-research export --token <address> [--chain bsc] [--provider fixture|moralis|etherscan] --format json|csv|md [--out file]

Shortcuts:
  bun run quick -- <token_address>      Save a Markdown report to reports/

Notes:
  - V1 uses fixture data by default. Use --provider moralis plus MORALIS_API_KEY for live BSC/EVM data.
  - Cluster results are suspected coordination evidence, not proof of common control.
`;
}
