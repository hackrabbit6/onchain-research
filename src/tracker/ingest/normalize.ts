import type { RawWalletActivityPage } from "../chains/provider.ts";
import type { WalletEvent } from "../domain/event.ts";

export interface WalletActivityNormalizer {
  normalize(page: RawWalletActivityPage): WalletEvent[];
}

export class EmptyNormalizer implements WalletActivityNormalizer {
  normalize(): WalletEvent[] {
    return [];
  }
}
