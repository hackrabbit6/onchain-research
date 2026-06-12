import { loadConfig } from "../config/env.ts";

const help = `onchain-research — wallet tracking (EVM/BSC)

Commands:
  doctor   Print resolved local configuration (data dir, exports, providers)

Planned (chain-neutral tracking loop, EVM adapters first):
  ingest <chain> <addr>   Fetch wallet activity into local raw storage
  normalize               Convert raw provider data into chain-neutral events
  analyze <addr>          Generate signal summary and rating inputs
  report <addr>           Export a Markdown wallet review

Solana meme-token research, watchlists, and trade journaling live in the
separate meme-flow-coach project.
`;

export async function runTracker(args: string[]): Promise<void> {
  const command = args[0] ?? "help";

  switch (command) {
    case "help":
    case "--help":
    case "-h":
      console.log(help);
      return;
    case "doctor": {
      const config = loadConfig();
      console.log(JSON.stringify(config, null, 2));
      return;
    }
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Run `onchain-research doctor` or `onchain-research help`.");
      process.exitCode = 1;
  }
}
