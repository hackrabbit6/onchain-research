import type { Chain, Holder, TokenDataset, TokenMetadata, WalletEvent, WalletSample } from "../domain/types";
import type { TokenDataProvider } from "./provider";

const API_URL = "https://deep-index.moralis.io/api/v2.2";
const CHAIN_NAMES: Record<Chain, string> = {
  bsc: "bsc",
  ethereum: "eth"
};

interface MoralisPage<T> {
  result: T[];
  page?: string | number;
  page_size?: string | number;
  cursor?: string;
  total_supply?: string;
}

interface MoralisTokenMetadata {
  address: string;
  name?: string;
  symbol?: string;
  decimals?: string;
  total_supply?: string;
  total_supply_formatted?: string;
  possible_spam?: string | boolean;
  address_label?: string;
}

interface MoralisOwner {
  owner_address: string;
  owner_address_label?: string;
  balance: string;
  balance_formatted?: string;
  percentage_relative_to_total_supply?: number;
  is_contract?: boolean;
  entity?: string;
}

interface MoralisTransfer {
  token_name?: string;
  token_symbol?: string;
  token_decimals?: string;
  transaction_hash: string;
  address?: string;
  block_timestamp: string;
  from_address: string;
  to_address: string;
  value: string | number;
  from_address_label?: string;
  to_address_label?: string;
  from_address_entity?: string;
  to_address_entity?: string;
}

const KNOWN_INFRA_WORDS = [
  "binance",
  "coinbase",
  "okx",
  "bybit",
  "kucoin",
  "gate",
  "mexc",
  "router",
  "pancakeswap",
  "liquidity",
  "pool",
  "bridge",
  "burn",
  "dead"
];

function parseNumber(value: string | number | undefined): number {
  if (value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function tokenAmount(value: string | number, decimals?: string): number {
  const raw = parseNumber(value);
  const divisor = 10 ** parseNumber(decimals ?? "18");
  return divisor > 0 ? raw / divisor : raw;
}

function infrastructureReason(...parts: Array<string | undefined>): string | undefined {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  const match = KNOWN_INFRA_WORDS.find((word) => text.includes(word));
  return match ? `label/entity contains "${match}"` : undefined;
}

function classifyOwner(owner: MoralisOwner): Pick<Holder, "label" | "knownReason" | "isKnownInfrastructure"> {
  const reason = infrastructureReason(owner.owner_address_label, owner.entity);
  if (reason || owner.is_contract) {
    return {
      label: owner.owner_address_label ?? owner.entity ?? (owner.is_contract ? "Contract address" : undefined),
      knownReason: reason ?? "contract holder; inspect before treating as wallet",
      isKnownInfrastructure: true
    };
  }

  return {
    label: owner.owner_address_label ?? owner.entity
  };
}

export class MoralisProvider implements TokenDataProvider {
  private readonly apiKey: string;
  private readonly sampleSize: number;

  constructor(options: { apiKey?: string; sampleSize?: number }) {
    if (!options.apiKey) {
      throw new Error(
        "Real Moralis data requires MORALIS_API_KEY. Example: MORALIS_API_KEY=xxx bun run cluster scan --provider moralis --chain bsc --token <address>"
      );
    }

    this.apiKey = options.apiKey;
    this.sampleSize = options.sampleSize ?? 8;
  }

  async getTokenDataset(input: { chain: Chain; token: string; top: number }): Promise<TokenDataset> {
    const metadata = await this.getTokenMetadata(input.chain, input.token);
    const owners = await this.getTopHolders(input.chain, input.token, input.top);
    const holders = owners.map((owner) => this.ownerToHolder(owner, metadata));

    const walletSamples: WalletSample[] = [];
    for (const holder of holders.filter((item) => !item.isKnownInfrastructure).slice(0, this.sampleSize)) {
      walletSamples.push(await this.getWalletSample({ chain: input.chain, address: holder.address, token: input.token }));
    }

    return { metadata, holders, walletSamples };
  }

  async getWalletSample(input: { chain: Chain; address: string; token?: string }): Promise<WalletSample> {
    const transfers = await this.getWalletTokenTransfers(input.chain, input.address, input.token);
    const events = transfers.map((transfer) => this.transferToEvent(input.address, transfer));

    return {
      address: input.address.toLowerCase(),
      baseBalance: 0,
      holdings: [],
      events,
      fundingSource: undefined,
      commonRouters: [
        ...new Set(
          transfers
            .flatMap((transfer) => [
              infrastructureReason(transfer.from_address_label, transfer.from_address_entity) ? transfer.from_address : undefined,
              infrastructureReason(transfer.to_address_label, transfer.to_address_entity) ? transfer.to_address : undefined
            ])
            .filter((address): address is string => typeof address === "string")
            .map((address) => address.toLowerCase())
        )
      ],
      warnings: [
        "Moralis V1 sample uses ERC20 transfer direction as buy/sell approximation.",
        "Native funding source, swap base size, and realized PnL need a richer swap/history pass later."
      ]
    };
  }

  private ownerToHolder(owner: MoralisOwner, metadata: TokenMetadata): Holder {
    const balance = owner.balance_formatted ? parseNumber(owner.balance_formatted) : tokenAmount(owner.balance, String(metadata.decimals));
    const percentage =
      owner.percentage_relative_to_total_supply ??
      (metadata.totalSupply > 0 ? (balance / metadata.totalSupply) * 100 : 0);

    return {
      address: owner.owner_address.toLowerCase(),
      balance,
      percentage,
      ...classifyOwner(owner)
    };
  }

  private transferToEvent(wallet: string, transfer: MoralisTransfer): WalletEvent {
    const normalizedWallet = wallet.toLowerCase();
    const from = transfer.from_address.toLowerCase();
    const to = transfer.to_address.toLowerCase();
    const isIncoming = to === normalizedWallet;
    const counterparty = isIncoming ? from : to;
    const counterpartyLabel = isIncoming
      ? infrastructureReason(transfer.from_address_label, transfer.from_address_entity)
      : infrastructureReason(transfer.to_address_label, transfer.to_address_entity);

    return {
      txHash: transfer.transaction_hash,
      wallet: normalizedWallet,
      timestamp: transfer.block_timestamp,
      type: isIncoming ? "buy" : "sell",
      tokenAddress: transfer.address?.toLowerCase(),
      amountToken: tokenAmount(transfer.value, transfer.token_decimals),
      counterparty,
      router: counterpartyLabel ? counterparty : undefined
    };
  }

  private async getTokenMetadata(chain: Chain, token: string): Promise<TokenMetadata> {
    const metadata = await this.request<MoralisTokenMetadata[]>("/erc20/metadata", {
      chain: CHAIN_NAMES[chain],
      addresses: token
    });
    const first = metadata[0];
    if (!first) {
      throw new Error(`Moralis returned no metadata for ${token}`);
    }

    return {
      chain,
      address: token.toLowerCase(),
      symbol: first.symbol ?? "UNKNOWN",
      name: first.name ?? "Unknown Token",
      decimals: parseNumber(first.decimals ?? "18"),
      totalSupply: parseNumber(first.total_supply_formatted ?? first.total_supply)
    };
  }

  private async getTopHolders(chain: Chain, token: string, top: number): Promise<MoralisOwner[]> {
    const page = await this.request<MoralisPage<MoralisOwner>>(`/erc20/${token}/owners`, {
      chain: CHAIN_NAMES[chain],
      limit: String(Math.min(top, 100)),
      order: "DESC"
    });

    return page.result.slice(0, top);
  }

  private async getWalletTokenTransfers(chain: Chain, address: string, token?: string): Promise<MoralisTransfer[]> {
    const params: Record<string, string> = {
      chain: CHAIN_NAMES[chain],
      limit: "50",
      order: "ASC"
    };
    if (token) params.contract_addresses = token;

    const page = await this.request<MoralisPage<MoralisTransfer>>(`/${address}/erc20/transfers`, params);
    return page.result;
  }

  private async request<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }

    const response = await fetch(url, {
      headers: {
        "X-API-Key": this.apiKey
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Moralis API HTTP ${response.status}: ${text || response.statusText}`);
    }

    return (await response.json()) as T;
  }
}
