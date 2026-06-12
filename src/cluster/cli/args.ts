import type { Chain, OutputFormat } from "../domain/types";

export interface ParsedArgs {
  command: string;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const [command = "help", ...rest] = argv;
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];

  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (!item.startsWith("--")) {
      positionals.push(item);
      continue;
    }

    const key = item.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return { command, positionals, flags };
}

export function stringFlag(flags: ParsedArgs["flags"], key: string, fallback?: string): string | undefined {
  const value = flags[key];
  if (typeof value === "string") return value;
  return fallback;
}

export function numberFlag(flags: ParsedArgs["flags"], key: string, fallback: number): number {
  const value = stringFlag(flags, key);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`--${key} must be a number`);
  }
  return parsed;
}

export function chainFlag(flags: ParsedArgs["flags"]): Chain {
  const chain = stringFlag(flags, "chain", "bsc");
  if (chain === "bsc" || chain === "ethereum") return chain;
  throw new Error("--chain must be bsc or ethereum");
}

export function formatFlag(flags: ParsedArgs["flags"], fallback: OutputFormat = "table"): OutputFormat {
  const format = stringFlag(flags, "format", fallback);
  if (format === "json" || format === "csv" || format === "table" || format === "md") return format;
  throw new Error("--format must be json, csv, table, or md");
}

export function tokenFlag(flags: ParsedArgs["flags"]): string {
  const token = stringFlag(flags, "token");
  if (!token) throw new Error("--token is required");
  return token.toLowerCase();
}

export function looksLikeEvmAddress(value: string | undefined): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value ?? "");
}

export function providerFlag(flags: ParsedArgs["flags"]): "fixture" | "etherscan" | "moralis" {
  const provider = stringFlag(flags, "provider", Bun.env.CLUSTER_PROVIDER ?? "fixture");
  if (provider === "fixture" || provider === "etherscan" || provider === "moralis") return provider;
  throw new Error("--provider must be fixture, moralis, or etherscan");
}
