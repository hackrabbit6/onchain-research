import type { Chain, TokenDataset, WalletSample } from "../domain/types";

export interface TokenDataProvider {
  getTokenDataset(input: {
    chain: Chain;
    token: string;
    top: number;
  }): Promise<TokenDataset>;
  getWalletSample(input: { chain: Chain; address: string; token?: string }): Promise<WalletSample>;
}

export interface ProviderOptions {
  name: "fixture" | "etherscan" | "moralis";
  apiKey?: string;
  sampleSize?: number;
}
