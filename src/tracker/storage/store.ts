import type { RawWalletActivityPage } from "../chains/provider.ts";
import type { WalletEvent } from "../domain/event.ts";
import type { SignalRating } from "../domain/signal.ts";

export interface WalletStore {
  saveRawActivity(page: RawWalletActivityPage): Promise<void>;
  saveEvents(events: WalletEvent[]): Promise<void>;
  saveSignalRating(rating: SignalRating): Promise<void>;
}
