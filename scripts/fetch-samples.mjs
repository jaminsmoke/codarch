import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * La muestra está fijada a un commit de `gh-pages` de CodeCharta ✓.
 *
 * El demo se regenera con cada release ✓ y los tests comparan números exactos ✓.
 * Fijarlo evita que la suite cambie sola cuando upstream publica ✓.
 */
const BASE =
  "https://raw.githubusercontent.com/MaibornWolff/codecharta/d4a8ccaac37effaf4059312a8df19a8ef93d41fd/visualization/app/";
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
