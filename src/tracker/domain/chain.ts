export type ChainId = "ethereum" | "bsc" | "base" | "arbitrum";

export type ChainAddress = {
  chain: ChainId;
  address: string;
};
