import type { SignalRating } from "../domain/signal.ts";

export function renderSignalRatingMarkdown(rating: SignalRating): string {
  return `# Wallet Signal Rating

- Chain: ${rating.wallet.chain}
- Address: ${rating.wallet.address}
- Signal score: ${rating.signalScore}/5
- Confidence score: ${rating.confidenceScore}/5
- Noise risk: ${rating.noiseRisk}

## Evidence

${list(rating.evidence)}

## Unknowns

${list(rating.unknowns)}

## Invalidation Rules

${list(rating.invalidationRules)}
`;
}

function list(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "-";
}
