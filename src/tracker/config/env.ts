import path from "node:path";

export type AppConfig = {
  dataDir: string;
  exportDir: string;
  providers: {
    ethereumRpcUrl?: string;
  };
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const ethereumRpcUrl = optional(env.ETHEREUM_RPC_URL);

  return {
    dataDir: path.resolve(env.WALLET_TRACKER_DATA_DIR ?? "data"),
    exportDir: path.resolve(env.WALLET_TRACKER_EXPORT_DIR ?? "exports"),
    providers: {
      ...(ethereumRpcUrl ? { ethereumRpcUrl } : {})
    }
  };
}

function optional(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}
