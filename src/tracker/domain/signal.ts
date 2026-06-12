import type { ChainAddress } from "./chain.ts";

export type SignalRating = {
  wallet: ChainAddress;
  signalScore: 1 | 2 | 3 | 4 | 5;
  confidenceScore: 1 | 2 | 3 | 4 | 5;
  noiseRisk: "low" | "medium" | "high";
  evidence: string[];
  unknowns: string[];
  invalidationRules: string[];
};
