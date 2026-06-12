import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import type { RawWalletActivityPage } from "../chains/provider.ts";
import type { WalletEvent } from "../domain/event.ts";
import type { SignalRating } from "../domain/signal.ts";
import type { WalletStore } from "./store.ts";

export class JsonlWalletStore implements WalletStore {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  async saveRawActivity(page: RawWalletActivityPage): Promise<void> {
    await this.appendJsonl(path.join(this.dataDir, "raw", `${page.chain}.jsonl`), page);
  }

  async saveEvents(events: WalletEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.appendJsonl(path.join(this.dataDir, "normalized", "wallet-events.jsonl"), events);
  }

  async saveSignalRating(rating: SignalRating): Promise<void> {
    await this.appendJsonl(path.join(this.dataDir, "state", "signal-ratings.jsonl"), rating);
  }

  private async appendJsonl(filePath: string, value: unknown): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true });
    await appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
  }
}
