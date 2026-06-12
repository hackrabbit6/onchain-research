import type { AddressCluster, Holder, OutputFormat, ScanReport, WalletSample } from "../domain/types";

function pct(value: number): string {
  return `${value.toFixed(2)}%`;
}

function short(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

function table(rows: string[][]): string {
  if (rows.length === 0) return "";
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column]?.length ?? 0)));
  return rows
    .map((row, index) => {
      const line = row.map((cell, column) => cell.padEnd(widths[column])).join("  ");
      if (index === 0) return `${line}\n${widths.map((width) => "-".repeat(width)).join("  ")}`;
      return line;
    })
    .join("\n");
}

function csvEscape(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function clusterEvidenceRows(clusters: AddressCluster[]): string[][] {
  return clusters.flatMap((cluster) =>
    cluster.evidence.map((item) => [
      cluster.id,
      cluster.confidence,
      String(cluster.score),
      item.rule,
      String(item.score),
      item.wallets.map(short).join(" | "),
      item.txHashes.join(" | "),
      item.reason
    ])
  );
}

export function formatScanReport(report: ScanReport, format: OutputFormat): string {
  if (format === "json") return `${JSON.stringify(report, null, 2)}\n`;

  if (format === "csv") {
    const rows = [
      ["cluster_id", "confidence", "cluster_score", "rule", "rule_score", "wallets", "tx_hashes", "reason"],
      ...clusterEvidenceRows(report.clusters)
    ];
    return `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
  }

  if (format === "md") return markdownScanReport(report);

  const holderRows = [
    ["Address", "Balance", "Holding", "Label"],
    ...report.filteredHolders.map((holder) => [
      short(holder.address),
      holder.balance.toLocaleString(),
      pct(holder.percentage),
      holder.label ?? ""
    ])
  ];
  const clusterRows = [
    ["Cluster", "Confidence", "Score", "Wallets", "Evidence"],
    ...report.clusters.map((cluster) => [
      cluster.id,
      cluster.confidence,
      String(cluster.score),
      String(cluster.addresses.length),
      String(cluster.evidence.length)
    ])
  ];

  return [
    `Token: ${report.token.symbol} (${report.token.address})`,
    `Top holder: ${pct(report.concentration.topHolderPercentage)} | Top 5: ${pct(report.concentration.topFivePercentage)} | Top 10: ${pct(report.concentration.topTenPercentage)}`,
    "",
    table(holderRows),
    "",
    table(clusterRows),
    "",
    ...report.warnings.map((warning) => `Warning: ${warning}`)
  ].join("\n");
}

export function markdownScanReport(report: ScanReport): string {
  const lines = [
    `# ${report.token.symbol} Wallet Cluster Report`,
    "",
    `- Chain: ${report.token.chain}`,
    `- Token: ${report.token.address}`,
    `- Top holder: ${pct(report.concentration.topHolderPercentage)}`,
    `- Top 5 filtered holders: ${pct(report.concentration.topFivePercentage)}`,
    `- Top 10 filtered holders: ${pct(report.concentration.topTenPercentage)}`,
    "",
    "## Filtered Holders",
    "",
    "| Address | Balance | Holding |",
    "|---|---:|---:|",
    ...report.filteredHolders.map((holder) => `| ${holder.address} | ${holder.balance} | ${pct(holder.percentage)} |`),
    "",
    "## Suspected Coordination Clusters",
    ""
  ];

  if (report.clusters.length === 0) {
    lines.push("No clusters crossed the V1 threshold.");
  }

  for (const cluster of report.clusters) {
    lines.push(`### ${cluster.id}`);
    lines.push("");
    lines.push(`- Confidence: ${cluster.confidence}`);
    lines.push(`- Score: ${cluster.score}`);
    lines.push(`- Wallets: ${cluster.addresses.join(", ")}`);
    lines.push("");
    lines.push("| Rule | Score | Evidence Tx | Reason |");
    lines.push("|---|---:|---|---|");
    for (const item of cluster.evidence) {
      lines.push(`| ${item.rule} | ${item.score} | ${item.txHashes.join(", ")} | ${item.reason} |`);
    }
    lines.push("");
    for (const warning of cluster.warnings) {
      lines.push(`- Warning: ${warning}`);
    }
    lines.push("");
  }

  lines.push("## Warnings");
  lines.push("");
  for (const warning of report.warnings) {
    lines.push(`- ${warning}`);
  }

  return `${lines.join("\n")}\n`;
}

export function formatWalletSample(sample: WalletSample, format: OutputFormat): string {
  if (format === "json") return `${JSON.stringify(sample, null, 2)}\n`;

  if (format === "csv") {
    const rows = [
      ["tx_hash", "type", "timestamp", "amount_base", "amount_token", "counterparty", "router"],
      ...sample.events.map((event) => [
        event.txHash,
        event.type,
        event.timestamp,
        event.amountBase ?? "",
        event.amountToken ?? "",
        event.counterparty ?? "",
        event.router ?? ""
      ])
    ];
    return `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
  }

  if (format === "md") {
    return [
      `# Wallet Sample ${sample.address}`,
      "",
      `- Base balance: ${sample.baseBalance}`,
      `- Funding source: ${sample.fundingSource ?? "unknown"}`,
      `- Common routers: ${sample.commonRouters.join(", ") || "none"}`,
      "",
      "## Events",
      "",
      "| Tx | Type | Time | Base | Token |",
      "|---|---|---|---:|---:|",
      ...sample.events.map(
        (event) =>
          `| ${event.txHash} | ${event.type} | ${event.timestamp} | ${event.amountBase ?? ""} | ${event.amountToken ?? ""} |`
      ),
      "",
      "## Warnings",
      "",
      ...(sample.warnings.length ? sample.warnings.map((warning) => `- ${warning}`) : ["- No fixture warnings."])
    ].join("\n");
  }

  const rows = [
    ["Tx", "Type", "Time", "Base", "Token"],
    ...sample.events.map((event) => [
      event.txHash,
      event.type,
      event.timestamp,
      String(event.amountBase ?? ""),
      String(event.amountToken ?? "")
    ])
  ];

  return [
    `Wallet: ${sample.address}`,
    `Base balance: ${sample.baseBalance}`,
    `Funding source: ${sample.fundingSource ?? "unknown"}`,
    "",
    table(rows),
    "",
    ...sample.warnings.map((warning) => `Warning: ${warning}`)
  ].join("\n");
}

export function holdersToCsv(holders: Holder[]): string {
  const rows = [
    ["address", "balance", "percentage", "label", "known_reason"],
    ...holders.map((holder) => [
      holder.address,
      holder.balance,
      holder.percentage,
      holder.label ?? "",
      holder.knownReason ?? ""
    ])
  ];
  return `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}
