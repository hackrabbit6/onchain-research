import type { ChainAddress, ChainId } from "./chain.ts";

export type WalletEventKind =
  | "buy"
  | "sell"
  | "transfer-in"
  | "transfer-out"
  | "swap"
  | "liquidity"
  | "contract-interaction"
  | "unknown";

export type AssetAmount = {
  asset: string;
  amount: string;
  decimals?: number;
  usdValue?: number;
};

export type WalletEvent = {
  id: string;
  chain: ChainId;
  wallet: ChainAddress;
  signature: string;
  blockTime: string;
  kind: WalletEventKind;
  incoming: AssetAmount[];
  outgoing: AssetAmount[];
  venue?: string;
  counterparty?: string;
  rawRef?: string;
};
