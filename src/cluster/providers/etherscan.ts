import type { Chain, Holder, TokenDataset, TokenMetadata, WalletEvent, WalletSample } from "../domain/types";
import type { TokenDataProvider } from "./provider";

const API_URL = "https://api.etherscan.io/v2/api";
const CHAIN_IDS: Record<Chain, string> = {
  bsc: "56",
  ethereum: "1"
};

const KNOWN_INFRA: Record<string, { label: string; reason: string }> = {
  "0x0000000000000000000000000000000000000000": { label: "Burn address", reason: "burn address" },
  "0x000000000000000000000000000000000000dead": { label: "Dead address", reason: "burn address" },
  "0x10ed43c718714eb63d5aa57b78b54704e256024e": {
    label: "PancakeSwap V2 Router",
    reason: "known router"
  },
  "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c": { label: "WBNB", reason: "wrapped native token" },
  "0x8894e0a0c962cb723c1976a4421c95949be2d4e3": { label: "Binance hot wallet", reason: "known CEX hot wallet" }
};

interface EtherscanEnvelope<T> {
  status: string;
  message: string;
  result: T;
}

interface TokenInfoResponse {
  tokenName?: string;
  symbol?: string;
  divisor?: string;
  totalSupply?: string;
}

interface TopHolderResponse {
  TokenHolderAddress: string;
  TokenHolderQuantity: string;
  TokenHolderAddressType?: string;
}

interface TokenTxResponse {
  hash: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  tokenDecimal?: string;
  contractAddress?: string;
  tokenSymbol?: string;
  functionName?: string;
}

interface FundedByResponse {
  timeStamp: string;
  fundingAddress: string;
  fundingTxn: string;
  value: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fromWei(value: string | undefined): number {
  return parseNumber(value) / 1e18;
}

function tokenAmount(value: string, decimals?: string): number {
  const raw = parseNumber(value);
  const divisor = 10 ** parseNumber(decimals ?? "18");
  return divisor > 0 ? raw / divisor : raw;
}

function isoFromUnix(timestamp: string): string {
  return new Date(parseNumber(timestamp) * 1000).toISOString();
}

function knownInfra(address: string): { label?: string; reason?: string; isKnownInfrastructure?: boolean } {
  const known = KNOWN_INFRA[address.toLowerCase()];
  if (!known) return {};
  return {
    label: known.label,
    reason: known.reason,
    isKnownInfrastructure: true
  };
}

function classifyHolder(address: string, addressType?: string): Pick<Holder, "label" | "knownReason" | "isKnownInfrastructure"> {
  const known = knownInfra(address);
  if (known.isKnownInfrastructure) {
    return {
      label: known.label,
      knownReason: known.reason,
      isKnownInfrastructure: true
    };
  }

  if (addressType === "C") {
    return {
      label: "Contract address",
      knownReason: "contract holder; inspect before treating as wallet",
      isKnownInfrastructure: true
    };
  }

  return {};
}

export class EtherscanProvider implements TokenDataProvider {
  private readonly apiKey: string;
  private readonly sampleSize: number;
  private lastRequestAt = 0;

  constructor(options: { apiKey?: string; sampleSize?: number }) {
    if (!options.apiKey) {
      throw new Error("Real data requires ETHERSCAN_API_KEY. Example: ETHERSCAN_API_KEY=xxx bun run cluster scan --provider etherscan --chain bsc --token <address>");
    }

    this.apiKey = options.apiKey;
    this.sampleSize = options.sampleSize ?? 8;
  }

  async getTokenDataset(input: { chain: Chain; token: string; top: number }): Promise<TokenDataset> {
    const [metadata, topHolders] = await Promise.all([
      this.getTokenMetadata(input.chain, input.token),
      this.getTopHolders(input.chain, input.token, input.top)
    ]);

    const holders = topHolders.map((holder) => {
      const balance = parseNumber(holder.TokenHolderQuantity);
      const classification = classifyHolder(holder.TokenHolderAddress, holder.TokenHolderAddressType);
      return {
        address: holder.TokenHolderAddress.toLowerCase(),
        balance,
        percentage: metadata.totalSupply > 0 ? (balance / metadata.totalSupply) * 100 : 0,
        ...classification
      };
    });

    const walletSamples: WalletSample[] = [];
    for (const holder of holders.filter((item) => !item.isKnownInfrastructure).slice(0, this.sampleSize)) {
      walletSamples.push(await this.getWalletSample({ chain: input.chain, address: holder.address, token: input.token }));
    }

    return { metadata, holders, walletSamples };
  }

  async getWalletSample(input: { chain: Chain; address: string; token?: string }): Promise<WalletSample> {
    const [balance, tokenTransfers, fundedBy] = await Promise.all([
      this.getNativeBalance(input.chain, input.address),
      input.token ? this.getTokenTransfers(input.chain, input.address, input.token) : Promise.resolve([]),
      this.getFundedBy(input.chain, input.address).catch(() => undefined)
    ]);

    const events: WalletEvent[] = [];
    if (fundedBy) {
      events.push({
        txHash: fundedBy.fundingTxn,
        wallet: input.address.toLowerCase(),
        timestamp: isoFromUnix(fundedBy.timeStamp),
        type: "funding",
        amountBase: fromWei(fundedBy.value),
        counterparty: fundedBy.fundingAddress.toLowerCase()
      });
    }

    events.push(...tokenTransfers.map((tx) => this.transferToEvent(input.address, tx)));

    return {
      address: input.address.toLowerCase(),
      baseBalance: balance,
      holdings: [],
      events,
      fundingSource: fundedBy?.fundingAddress.toLowerCase(),
      commonRouters: [...new Set(tokenTransfers.map((tx) => tx.from.toLowerCase()).filter((from) => knownInfra(from).isKnownInfrastructure))],
      warnings: [
        "Live wallet sample uses explorer token transfers; swap base amount and router inference are approximate.",
        "Real PnL is not calculated in V1."
      ]
    };
  }

  private transferToEvent(wallet: string, tx: TokenTxResponse): WalletEvent {
    const normalizedWallet = wallet.toLowerCase();
    const from = tx.from.toLowerCase();
    const to = tx.to.toLowerCase();
    const isIncoming = to === normalizedWallet;

    return {
      txHash: tx.hash,
      wallet: normalizedWallet,
      timestamp: isoFromUnix(tx.timeStamp),
      type: isIncoming ? "buy" : "sell",
      tokenAddress: tx.contractAddress?.toLowerCase(),
      amountToken: tokenAmount(tx.value, tx.tokenDecimal),
      counterparty: isIncoming ? from : to,
      router: knownInfra(isIncoming ? from : to).isKnownInfrastructure ? (isIncoming ? from : to) : undefined
    };
  }

  private async getTokenMetadata(chain: Chain, token: string): Promise<TokenMetadata> {
    const info = await this.request<TokenInfoResponse[]>({
      chain,
      module: "token",
      action: "tokeninfo",
      contractaddress: token
    });
    const first = info[0];
    if (first) {
      return {
        chain,
        address: token.toLowerCase(),
        symbol: first.symbol ?? "UNKNOWN",
        name: first.tokenName ?? "Unknown Token",
        decimals: parseNumber(first.divisor ?? "18"),
        totalSupply: parseNumber(first.totalSupply)
      };
    }

    const supply = await this.request<string>({
      chain,
      module: "stats",
      action: "tokensupply",
      contractaddress: token
    });

    return {
      chain,
      address: token.toLowerCase(),
      symbol: "UNKNOWN",
      name: "Unknown Token",
      decimals: 18,
      totalSupply: fromWei(supply)
    };
  }

  private getTopHolders(chain: Chain, token: string, top: number): Promise<TopHolderResponse[]> {
    return this.request<TopHolderResponse[]>({
      chain,
      module: "token",
      action: "topholders",
      contractaddress: token,
      offset: String(Math.min(top, 1000))
    });
  }

  private getNativeBalance(chain: Chain, address: string): Promise<number> {
    return this.request<string>({
      chain,
      module: "account",
      action: "balance",
      address,
      tag: "latest"
    }).then(fromWei);
  }

  private getTokenTransfers(chain: Chain, address: string, token: string): Promise<TokenTxResponse[]> {
    return this.request<TokenTxResponse[]>({
      chain,
      module: "account",
      action: "tokentx",
      address,
      contractaddress: token,
      startblock: "0",
      endblock: "999999999",
      page: "1",
      offset: "25",
      sort: "asc"
    });
  }

  private getFundedBy(chain: Chain, address: string): Promise<FundedByResponse> {
    return this.request<FundedByResponse>({
      chain,
      module: "account",
      action: "fundedby",
      address
    });
  }

  private async request<T>(params: Record<string, string> & { chain: Chain }): Promise<T> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < 550) await sleep(550 - elapsed);
    this.lastRequestAt = Date.now();

    const url = new URL(API_URL);
    url.searchParams.set("apikey", this.apiKey);
    url.searchParams.set("chainid", CHAIN_IDS[params.chain]);

    for (const [key, value] of Object.entries(params)) {
      if (key !== "chain") url.searchParams.set(key, value);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Etherscan API HTTP ${response.status}: ${response.statusText}`);
    }

    const payload = (await response.json()) as EtherscanEnvelope<T>;
    if (payload.status !== "1") {
      throw new Error(`Etherscan API ${payload.message}: ${typeof payload.result === "string" ? payload.result : JSON.stringify(payload.result)}`);
    }

    return payload.result;
  }
}
