import { EtherscanProvider } from "./etherscan";
import { FixtureProvider } from "./fixture";
import { MoralisProvider } from "./moralis";
import type { ProviderOptions, TokenDataProvider } from "./provider";

export function createProvider(options: ProviderOptions = { name: "fixture" }): TokenDataProvider {
  switch (options.name) {
    case "moralis":
      return new MoralisProvider({
        apiKey: options.apiKey ?? Bun.env.MORALIS_API_KEY,
        sampleSize: options.sampleSize
      });
    case "etherscan":
      return new EtherscanProvider({
        apiKey: options.apiKey ?? Bun.env.ETHERSCAN_API_KEY,
        sampleSize: options.sampleSize
      });
    case "fixture":
      return new FixtureProvider();
  }
}
