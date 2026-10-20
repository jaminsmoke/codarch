import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE = "https://codecharta.com/visualization/app/";
const FILES = [
  "codecharta_visualization.cc.json.gz",
  "codecharta_analysis.cc.json.gz"
];

await mkdir("samples", { recursive: true });

for (const file of FILES) {
  const response = await fetch(BASE + file);
  if (!response.ok) {
    console.error(`${file}: HTTP ${response.status}`);
    process.exitCode = 1;
    continue;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(join("samples", file), bytes);
  console.log(`${file}: ${(bytes.length / 1024).toFixed(0)} KB`);
}
