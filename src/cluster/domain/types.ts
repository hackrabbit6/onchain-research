export type Chain = "bsc" | "ethereum";

export type OutputFormat = "json" | "csv" | "table" | "md";

export type Confidence = "low" | "medium" | "high";

export interface TokenMetadata {
  chain: Chain;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: number;
}

export interface Holder {
  address: string;
  balance: number;
  percentage: number;
  label?: string;
  isKnownInfrastructure?: boolean;
  knownReason?: string;
}

export type WalletEventType = "funding" | "buy" | "sell" | "transfer";

export interface WalletEvent {
  txHash: string;
  wallet: string;
  timestamp: string;
  type: WalletEventType;
  tokenAddress?: string;
  amountToken?: number;
  amountBase?: number;
  counterparty?: string;
  router?: string;
}

export interface WalletSample {
  address: string;
  baseBalance: number;
  holdings: Holder[];
  events: WalletEvent[];
  fundingSource?: string;
  commonRouters: string[];
  warnings: string[];
}

export interface TokenDataset {
  metadata: TokenMetadata;
  holders: Holder[];
  walletSamples: WalletSample[];
}

export interface RuleEvidence {
  rule: string;
  score: number;
  reason: string;
  txHashes: string[];
  wallets: string[];
}

export interface AddressCluster {
  id: string;
  addresses: string[];
  score: number;
  confidence: Confidence;
  evidence: RuleEvidence[];
  warnings: string[];
}

export interface ScanReport {
  token: TokenMetadata;
  topHolders: Holder[];
  filteredHolders: Holder[];
  concentration: {
    topHolderPercentage: number;
    topFivePercentage: number;
    topTenPercentage: number;
  };
  clusters: AddressCluster[];
  warnings: string[];
}
