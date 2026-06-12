import type { AddressCluster, RuleEvidence, WalletEvent, WalletSample } from "../domain/types";

const THRESHOLD = 60;
const BUY_WINDOW_MINUTES = 30;
const SELL_WINDOW_MINUTES = 45;
const AMOUNT_TOLERANCE = 0.12;

interface PairScore {
  wallets: [string, string];
  evidence: RuleEvidence[];
}

function minutesBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60_000;
}

function amountClose(a?: number, b?: number): boolean {
  if (!a || !b) return false;
  const max = Math.max(a, b);
  return Math.abs(a - b) / max <= AMOUNT_TOLERANCE;
}

function firstEvent(sample: WalletSample, type: WalletEvent["type"]): WalletEvent | undefined {
  return sample.events
    .filter((event) => event.type === type)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
}

function isString(value: string | undefined): value is string {
  return typeof value === "string";
}

function scorePair(a: WalletSample, b: WalletSample): PairScore {
  const evidence: RuleEvidence[] = [];
  const aBuy = firstEvent(a, "buy");
  const bBuy = firstEvent(b, "buy");
  const aSell = firstEvent(a, "sell");
  const bSell = firstEvent(b, "sell");
  const aFunding = firstEvent(a, "funding");
  const bFunding = firstEvent(b, "funding");

  if (aFunding && bFunding && a.fundingSource && a.fundingSource.toLowerCase() === b.fundingSource?.toLowerCase()) {
    evidence.push({
      rule: "same_funding_source",
      score: 40,
      reason: `Both wallets were funded by ${a.fundingSource}`,
      txHashes: [aFunding.txHash, bFunding.txHash].filter(isString),
      wallets: [a.address, b.address]
    });
  }

  if (aBuy?.counterparty && aBuy.counterparty.toLowerCase() === bBuy?.counterparty?.toLowerCase()) {
    evidence.push({
      rule: "same_acquisition_counterparty",
      score: 35,
      reason: `Both wallets received/acquired token from ${aBuy.counterparty}`,
      txHashes: [aBuy.txHash, bBuy.txHash],
      wallets: [a.address, b.address]
    });
  }

  if (aBuy && bBuy && minutesBetween(aBuy.timestamp, bBuy.timestamp) <= BUY_WINDOW_MINUTES) {
    evidence.push({
      rule: "near_buy_window",
      score: 25,
      reason: `Buys happened within ${BUY_WINDOW_MINUTES} minutes`,
      txHashes: [aBuy.txHash, bBuy.txHash],
      wallets: [a.address, b.address]
    });
  }

  if (aBuy && bBuy && amountClose(aBuy.amountBase, bBuy.amountBase)) {
    evidence.push({
      rule: "similar_buy_size",
      score: 15,
      reason: "Base-asset buy sizes are close",
      txHashes: [aBuy.txHash, bBuy.txHash],
      wallets: [a.address, b.address]
    });
  }

  if (aSell && bSell && minutesBetween(aSell.timestamp, bSell.timestamp) <= SELL_WINDOW_MINUTES) {
    evidence.push({
      rule: "near_sell_window",
      score: 15,
      reason: `Sells happened within ${SELL_WINDOW_MINUTES} minutes`,
      txHashes: [aSell.txHash, bSell.txHash],
      wallets: [a.address, b.address]
    });
  }

  const aTransfersToB = a.events.filter(
    (event) => event.type === "transfer" && event.counterparty?.toLowerCase() === b.address.toLowerCase()
  );
  const bTransfersToA = b.events.filter(
    (event) => event.type === "transfer" && event.counterparty?.toLowerCase() === a.address.toLowerCase()
  );
  const transferTxs = [...aTransfersToB, ...bTransfersToA].map((event) => event.txHash);

  if (transferTxs.length > 0) {
    evidence.push({
      rule: "mutual_transfer",
      score: 30,
      reason: "Wallets transferred value between each other",
      txHashes: transferTxs,
      wallets: [a.address, b.address]
    });
  }

  const sharedRouters = a.commonRouters.filter((router) =>
    b.commonRouters.some((other) => other.toLowerCase() === router.toLowerCase())
  );

  if (sharedRouters.length > 0 && aBuy && bBuy) {
    evidence.push({
      rule: "same_router",
      score: 10,
      reason: `Both wallets used ${sharedRouters.join(", ")}`,
      txHashes: [aBuy.txHash, bBuy.txHash],
      wallets: [a.address, b.address]
    });
  }

  return { wallets: [a.address, b.address], evidence };
}

function confidence(score: number): AddressCluster["confidence"] {
  if (score >= 85) return "high";
  if (score >= THRESHOLD) return "medium";
  return "low";
}

function mergePairClusters(pairs: PairScore[]): AddressCluster[] {
  const clusters: AddressCluster[] = [];

  for (const pair of pairs) {
    const pairScore = pair.evidence.reduce((sum, item) => sum + item.score, 0);
    if (pairScore < THRESHOLD) continue;

    const existing = clusters.find((cluster) =>
      pair.wallets.some((wallet) => cluster.addresses.includes(wallet))
    );

    if (!existing) {
      clusters.push({
        id: `cluster-${clusters.length + 1}`,
        addresses: [...pair.wallets],
        score: pairScore,
        confidence: confidence(pairScore),
        evidence: pair.evidence,
        warnings: ["Suspected coordination only; not proof of common control."]
      });
      continue;
    }

    existing.addresses = [...new Set([...existing.addresses, ...pair.wallets])];
    existing.evidence = [...existing.evidence, ...pair.evidence];
    existing.score = Math.min(
      100,
      Math.round(existing.evidence.reduce((sum, item) => sum + item.score, 0) / Math.max(1, existing.addresses.length - 1))
    );
    existing.confidence = confidence(existing.score);
  }

  return clusters;
}

export function buildClusters(samples: WalletSample[]): AddressCluster[] {
  const validSamples = samples.filter((sample) => !sample.warnings.some((warning) => warning.includes("Known infrastructure")));
  const pairs: PairScore[] = [];

  for (let i = 0; i < validSamples.length; i += 1) {
    for (let j = i + 1; j < validSamples.length; j += 1) {
      pairs.push(scorePair(validSamples[i], validSamples[j]));
    }
  }

  return mergePairClusters(pairs);
}
