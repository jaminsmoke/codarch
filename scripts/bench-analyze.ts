import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { analyzeRepository } from "@codarch/parsers";

const FILES = Number(process.env.FILES ?? 2_000);
const FOLDERS = Number(process.env.FOLDERS ?? 40);
const ITERATIONS = Number(process.env.ITERATIONS ?? 1);
const WARMUP = process.env.WARMUP === "1";
const filesPerFolder = Math.ceil(FILES / FOLDERS);

const numberFormat = new Intl.NumberFormat("es-ES");

function num(value: number): string {
  return numberFormat.format(value);
}

function formatMs(value: number): string {
  return value < 1000 ? `${value.toFixed(0)} ms` : `${(value / 1000).toFixed(2)} s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function generateProject(root: string): number {
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "codarch-analyze-bench", private: true }, null, 2),
    "utf8"
  );

  let written = 0;
  for (let folder = 0; folder < FOLDERS && written < FILES; folder++) {
    const directory = path.join(root, "src", `module-${folder}`);
    fs.mkdirSync(directory, { recursive: true });

    for (let index = 0; index < filesPerFolder && written < FILES; index++) {
      const lines: string[] = [];
      if (index > 0) {
        lines.push(`import { value as previous } from "./file-${index - 1}";`);
        lines.push("");
      } else if (folder > 0) {
        lines.push(
          `import { value as previous } from "../module-${folder - 1}/file-${filesPerFolder - 1}";`
        );
        lines.push("");
      }

      lines.push(`export function compute${written}(input: number): number {`);
      lines.push("  let total = input;");
      lines.push("  if (input > 0) {");
      lines.push("    total += input * 2;");
      lines.push("  } else {");
      lines.push("    total -= 1;");
      lines.push("  }");
      lines.push("  for (let step = 0; step < 4; step++) {");
      lines.push("    total += step;");
      lines.push("  }");
      lines.push("  return total;");
      lines.push("}");
      lines.push("");
      lines.push(`export const value = ${written};`);

      fs.writeFileSync(
        path.join(directory, `file-${index}.ts`),
        `${lines.join("\n")}\n`,
        "utf8"
      );
      written++;
    }
  }

  return written;
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-analyze-bench-"));
let exitCode = 0;

try {
  const generatedAt = performance.now();
  const generated = generateProject(root);
  const generationMs = performance.now() - generatedAt;

  // Por defecto se mide una sola pasada: es el coste real de un `analyze`. Con
  // varias pasadas, los árboles nativos de tree-sitter pueden acumularse hasta
  // que el GC actúa y la memoria deja de representar el caso de uso.
  let last: ReturnType<typeof analyzeRepository> | undefined;
  if (WARMUP) {
    last = analyzeRepository(root, { projectName: "bench", git: false });
  }
  const times: number[] = [];

  for (let iteration = 0; iteration < ITERATIONS; iteration++) {
    const started = performance.now();
    last = analyzeRepository(root, { projectName: "bench", git: false });
    times.push(performance.now() - started);
  }

  if (!last) throw new Error("no se ejecutó ninguna pasada del benchmark");

  const snapshotBytes = Buffer.byteLength(
    JSON.stringify(last.snapshot),
    "utf8"
  );
  const memory = process.memoryUsage();
  const duration = median(times);
  const targetMet = duration < 3_000 && memory.rss < 500 * 1024 * 1024;

  if (!targetMet) exitCode = 1;

  console.log("");
  console.log("  CodArch · benchmark analyze");
  console.log("");
  console.log(`  ficheros      ${num(generated)} (${num(FOLDERS)} carpetas)`);
  console.log(`  aristas       ${num(last.edges)}`);
  console.log(`  métricas      ${num(last.metricNames.length)}`);
  console.log(`  generación    ${formatMs(generationMs)}`);
  console.log(
    `  análisis      ${formatMs(duration)} mediana · ${formatMs(
      Math.min(...times)
    )} min · ${formatMs(Math.max(...times))} max (${ITERATIONS} pasadas)`
  );
  console.log(`  snapshot      ${formatBytes(snapshotBytes)} sin comprimir`);
  console.log(
    `  memoria       ${formatBytes(memory.rss)} RSS · ${formatBytes(
      memory.heapUsed
    )} heap`
  );
  console.log(`  checksum      ${last.snapshot.meta.checksum ?? "—"}`);
  console.log(
    `  objetivo      < 3 s y < 500 MB: ${targetMet ? "cumplido" : "pendiente"}`
  );
  console.log("");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

process.exitCode = exitCode;
