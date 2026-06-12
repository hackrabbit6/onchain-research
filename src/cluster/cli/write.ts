import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export async function writeOutput(content: string, out?: string): Promise<void> {
  if (!out) {
    process.stdout.write(content.endsWith("\n") ? content : `${content}\n`);
    return;
  }

  await mkdir(dirname(out), { recursive: true });
  await Bun.write(out, content);
  process.stdout.write(`Wrote ${out}\n`);
}
