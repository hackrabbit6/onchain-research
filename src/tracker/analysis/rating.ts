import type { ChainAddress } from "../domain/chain.ts";
import type { WalletEvent } from "../domain/event.ts";
import type { SignalRating } from "../domain/signal.ts";

export function createInitialSignalRating(wallet: ChainAddress, events: WalletEvent[]): SignalRating {
  const evidence = events.length > 0 ? [`Observed ${events.length} normalized events.`] : [];
  const unknowns = [
    "Realized PnL quality is not calculated yet.",
    "Entry timing versus public attention is not calculated yet.",
    "Related wallet cluster evidence is not calculated yet."
  ];

  return {
    wallet,
    signalScore: 1,
    confidenceScore: 1,
    noiseRisk: "high",
    evidence,
    unknowns,
    invalidationRules: [
      "Demote if behavior cannot be monitored forward.",
      "Demote if apparent edge depends on one lucky trade.",
      "Demote if high activity does not translate into repeatable exit quality."
    ]
  };
}
