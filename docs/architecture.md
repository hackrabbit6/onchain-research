# Architecture

## Goal

Build a local-first wallet tracker that turns chain activity into durable research artifacts:

1. Fetch raw wallet activity.
2. Normalize it into chain-neutral wallet events.
3. Analyze behavior, PnL quality, timing, sizing, venues, and relationships.
4. Export concise wallet reviews for human judgment.
5. Promote durable findings into Obsidian memory.

## Boundaries

- `chains/` knows provider quirks.
- `domain/` knows the stable research vocabulary.
- `ingest/` converts provider data into domain events.
- `analysis/` extracts signal and invalidation inputs.
- `storage/` persists local data.
- `report/` produces review artifacts.

## Storage Strategy

Start with append-only JSONL files because they are easy to diff, back up, inspect, and regenerate. Move to SQLite only when query complexity or volume demands it.

## Non-Goals For V1

- Real-time alerting.
- Hosted dashboard.
- Automatic trade recommendations.
- Saving raw transaction dumps into durable memory.
