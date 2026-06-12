import type { ChainProvider, FetchCursor, RawWalletActivityPage } from "../provider.ts";
import type { ChainAddress, ChainId } from "../../domain/chain.ts";

export class EvmProvider implements ChainProvider {
  constructor(
    readonly chain: Extract<ChainId, "ethereum" | "base" | "arbitrum">,
    private readonly rpcUrl: string
  ) {}

  async fetchWalletActivity(wallet: ChainAddress, cursor?: FetchCursor): Promise<RawWalletActivityPage> {
    void this.rpcUrl;
    return {
      chain: this.chain,
      wallet,
      provider: "evm-rpc",
      fetchedAt: new Date().toISOString(),
      ...(cursor ? { cursor } : {}),
      records: []
    };
  }
}
