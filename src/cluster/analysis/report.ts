import type { Holder, ScanReport, TokenDataset } from "../domain/types";
import { buildClusters } from "./cluster";

export function isKnownInfrastructure(holder: Holder): boolean {
  if (holder.isKnownInfrastructure) return true;
  const label = `${holder.label ?? ""} ${holder.knownReason ?? ""}`.toLowerCase();
  return ["cex", "hot wallet", "router", "liquidity", "lp", "burn"].some((word) => label.includes(word));
}

function concentration(holders: Holder[]) {
  return {
    topHolderPercentage: holders[0]?.percentage ?? 0,
    topFivePercentage: holders.slice(0, 5).reduce((sum, holder) => sum + holder.percentage, 0),
    topTenPercentage: holders.slice(0, 10).reduce((sum, holder) => sum + holder.percentage, 0)
  };
}

export function buildScanReport(dataset: TokenDataset): ScanReport {
  const filteredHolders = dataset.holders.filter((holder) => !isKnownInfrastructure(holder));
  const clusters = buildClusters(dataset.walletSamples);

  const warnings = ["Cluster output is research evidence, not proof of common control."];

  if (dataset.holders.some(isKnownInfrastructure)) {
    warnings.push("Known CEX, LP, router, burn, or infrastructure addresses were filtered from cluster scoring.");
  }

  return {
    token: dataset.metadata,
    topHolders: dataset.holders,
    filteredHolders,
    concentration: concentration(filteredHolders),
    clusters,
    warnings
  };
}
