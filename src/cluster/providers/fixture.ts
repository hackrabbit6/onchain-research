import type { Chain, Holder, TokenDataset, WalletSample } from "../domain/types";
import type { TokenDataProvider } from "./provider";

const TOKEN = "0xccfb3e8b1772bd3a9fc62deaf75127adad597777";

const WALLETS = {
  a: "0x1111111111111111111111111111111111111111",
  b: "0x2222222222222222222222222222222222222222",
  c: "0x3333333333333333333333333333333333333333",
  d: "0x4444444444444444444444444444444444444444",
  funder: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  router: "0x10ed43c718714eb63d5aa57b78b54704e256024e",
  lp: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
  cex: "0x8894e0a0c962cb723c1976a4421c95949be2d4e3"
};

const holders: Holder[] = [
  { address: WALLETS.a, balance: 180_000, percentage: 18 },
  { address: WALLETS.b, balance: 165_000, percentage: 16.5 },
  { address: WALLETS.c, balance: 150_000, percentage: 15 },
  {
    address: WALLETS.cex,
    balance: 120_000,
    percentage: 12,
    label: "Binance hot wallet",
    isKnownInfrastructure: true,
    knownReason: "known CEX hot wallet"
  },
  {
    address: WALLETS.lp,
    balance: 95_000,
    percentage: 9.5,
    label: "WBNB / token pool",
    isKnownInfrastructure: true,
    knownReason: "liquidity / router infrastructure"
  },
  { address: WALLETS.d, balance: 60_000, percentage: 6 },
  { address: "0x5555555555555555555555555555555555555555", balance: 40_000, percentage: 4 }
];

const baseEvents = [
  {
    txHash: "0xfund-a",
    wallet: WALLETS.a,
    timestamp: "2026-06-02T06:00:00.000Z",
    type: "funding" as const,
    amountBase: 2,
    counterparty: WALLETS.funder
  },
  {
    txHash: "0xbuy-a",
    wallet: WALLETS.a,
    timestamp: "2026-06-02T06:14:00.000Z",
    type: "buy" as const,
    tokenAddress: TOKEN,
    amountToken: 180_000,
    amountBase: 1.2,
    router: WALLETS.router
  },
  {
    txHash: "0xfund-b",
    wallet: WALLETS.b,
    timestamp: "2026-06-02T06:02:00.000Z",
    type: "funding" as const,
    amountBase: 2,
    counterparty: WALLETS.funder
  },
  {
    txHash: "0xbuy-b",
    wallet: WALLETS.b,
    timestamp: "2026-06-02T06:18:00.000Z",
    type: "buy" as const,
    tokenAddress: TOKEN,
    amountToken: 165_000,
    amountBase: 1.18,
    router: WALLETS.router
  },
  {
    txHash: "0xfund-c",
    wallet: WALLETS.c,
    timestamp: "2026-06-02T06:04:00.000Z",
    type: "funding" as const,
    amountBase: 2,
    counterparty: WALLETS.funder
  },
  {
    txHash: "0xbuy-c",
    wallet: WALLETS.c,
    timestamp: "2026-06-02T06:21:00.000Z",
    type: "buy" as const,
    tokenAddress: TOKEN,
    amountToken: 150_000,
    amountBase: 1.21,
    router: WALLETS.router
  },
  {
    txHash: "0xbuy-d",
    wallet: WALLETS.d,
    timestamp: "2026-06-02T11:30:00.000Z",
    type: "buy" as const,
    tokenAddress: TOKEN,
    amountToken: 60_000,
    amountBase: 0.28,
    router: WALLETS.router
  }
];

function isString(value: string | undefined): value is string {
  return typeof value === "string";
}

function sample(address: string): WalletSample {
  const events = baseEvents.filter((event) => event.wallet.toLowerCase() === address.toLowerCase());
  const holder = holders.find((item) => item.address.toLowerCase() === address.toLowerCase());
  const routers = new Set(events.map((event) => event.router).filter(isString));

  return {
    address,
    baseBalance: address === WALLETS.d ? 0.41 : 0.83,
    holdings: holder ? [holder] : [],
    events,
    fundingSource: events.find((event) => event.type === "funding")?.counterparty,
    commonRouters: [...routers],
    warnings: holder?.isKnownInfrastructure ? [`Known infrastructure: ${holder.knownReason}`] : []
  };
}

export class FixtureProvider implements TokenDataProvider {
  async getTokenDataset(input: { chain: Chain; token: string; top: number }): Promise<TokenDataset> {
    return {
      metadata: {
        chain: input.chain,
        address: input.token.toLowerCase(),
        symbol: "APPLE",
        name: "Fixture Apple Token",
        decimals: 18,
        totalSupply: 1_000_000
      },
      holders: holders.slice(0, input.top),
      walletSamples: holders
        .filter((holder) => !holder.isKnownInfrastructure)
        .slice(0, input.top)
        .map((holder) => sample(holder.address))
    };
  }

  async getWalletSample(input: { chain: Chain; address: string; token?: string }): Promise<WalletSample> {
    return sample(input.address.toLowerCase());
  }
}
