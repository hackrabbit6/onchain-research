import { buildScanReport } from "./analysis/report";
import {
  chainFlag,
  formatFlag,
  looksLikeEvmAddress,
  numberFlag,
  parseArgs,
  providerFlag,
  stringFlag,
  tokenFlag
} from "./cli/args";
import { clusterHelpText } from "./cli/help";
import { writeOutput } from "./cli/write";
import { formatScanReport, formatWalletSample } from "./output/format";
import { createProvider } from "./providers";

function reportPath(symbol: string, token: string): string {
  const stamp = new Date().toISOString().replaceAll(":", "-").slice(0, 16);
  const safeSymbol = symbol.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "token";
  return `reports/${safeSymbol}-${token.slice(2, 38)}-${stamp}.md`;
}

/** Run the EVM/BSC holder-clustering subcommands (scan / cluster / wallet / export). */
export async function runCluster(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  const sampleSize = numberFlag(args.flags, "sample", 8);
  const provider = createProvider({ name: providerFlag(args.flags), sampleSize });
  const shorthandToken = looksLikeEvmAddress(args.command) ? args.command.toLowerCase() : undefined;
  const command = shorthandToken ? "scan" : args.command;

  if (command === "help" || args.flags.help) {
    process.stdout.write(clusterHelpText());
    return;
  }

  if (command === "scan" || command === "cluster" || command === "export") {
    const chain = chainFlag(args.flags);
    const token = shorthandToken ?? tokenFlag(args.flags);
    const top = numberFlag(args.flags, "top", 50);
    const format = shorthandToken ? "md" : command === "export" ? formatFlag(args.flags, "md") : formatFlag(args.flags);
    const dataset = await provider.getTokenDataset({ chain, token, top });
    const report = buildScanReport(dataset);
    const out = stringFlag(args.flags, "out") ?? (shorthandToken ? reportPath(report.token.symbol, token) : undefined);

    if (command === "cluster") {
      await writeOutput(formatScanReport({ ...report, topHolders: [], filteredHolders: [] }, format), out);
      return;
    }

    await writeOutput(formatScanReport(report, format), out);
    return;
  }

  if (command === "wallet") {
    const address = args.positionals[0];
    if (!address) throw new Error("wallet address is required");
    const chain = chainFlag(args.flags);
    const format = formatFlag(args.flags);
    const out = stringFlag(args.flags, "out");
    const sample = await provider.getWalletSample({
      chain,
      address: address.toLowerCase(),
      token: stringFlag(args.flags, "token")?.toLowerCase()
    });
    await writeOutput(formatWalletSample(sample, format), out);
    return;
  }

  throw new Error(`Unknown cluster command: ${args.command}\n\n${clusterHelpText()}`);
}
