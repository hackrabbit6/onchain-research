import type { ChainAddress, ChainId } from "../domain/chain.ts";

export type FetchCursor = {
  before?: string;
  after?: string;
};

export type RawWalletActivityPage = {
  chain: ChainId;
  wallet: ChainAddress;
  provider: string;
  fetchedAt: string;
  cursor?: FetchCursor;
  nextCursor?: FetchCursor;
  records: unknown[];
};

export interface ChainProvider {
  readonly chain: ChainId;
  fetchWalletActivity(wallet: ChainAddress, cursor?: FetchCursor): Promise<RawWalletActivityPage>;
}
