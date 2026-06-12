import type { ChainAddress } from "./chain.ts";

export type WalletConfidence = "lead" | "watch" | "validated" | "pattern-source" | "demoted";

export type WalletProfile = ChainAddress & {
  label?: string;
  confidence: WalletConfidence;
  strategyType?: string;
  hypothesis?: string;
  firstObservedAt: string;
  lastReviewedAt?: string;
};
