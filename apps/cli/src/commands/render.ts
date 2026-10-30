import fs from "node:fs";
import path from "node:path";
import type { LintArtifact } from "@codarch/lint";
import type { CcJson } from "@codarch/schema";
import { CcJsonError, parseCcJson, walkFiles } from "@codarch/schema";
import { formatBytes, readJsonFile } from "../io";
import { readLintBeside } from "../lint-store";
import { findWebRoot } from "../web-root";

export interface RenderCommandOptions {
  file?: string;
  out?: string;
  help: boolean;
}

/**
 * Directorio de salida por defecto: junto al `cc.json`, con su nombre.
 *
 * La salida es una carpeta, no un fichero: dentro va la app y el snapshot
 * (ADR 0073).
 */
export function defaultOutputPath(input: string): string {
  const lower = input.toLowerCase();
  const suffixes = [".cc.json.gz", ".cc.json", ".json.gz", ".json", ".gz"];
  for (const suffix of suffixes) {
    if (lower.endsWith(suffix)) return input.slice(0, -suffix.length);
  }
  return `${input}.sitio`;
}

const numberFormat = new Intl.NumberFormat("es-ES");

function num(value: number): string {
  return numberFormat.format(value);
}

function field(label: string, value: string): string {
  return `  ${label.padEnd(12)} ${value}`;
}

/**
 * Copia el build de la app y deja el snapshot en `data/`.
 *
 * Es el único paso que escribe: separado para poder probarlo sin depender de
 * que este checkout tenga `apps/web/dist` construido.
 */
export function publishSnapshot(
  cc: CcJson,
  out: string,
  webRoot: string,
  lint: LintArtifact | null = null
): void {
  fs.mkdirSync(out, { recursive: true });
  // El build va tal cual: es la misma app que sirve `codarch serve`.
  fs.cpSync(webRoot, out, { recursive: true });
  const data = path.join(out, "data");
  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(
    path.join(data, "snapshot.cc.json"),
    `${JSON.stringify(cc, null, 2)}\n`,
    "utf8"
  );
  // El lint viaja con el snapshot si estaba al lado (ADR 0094): la app
  // publicada lo carga igual que la que sirve `codarch serve`.
  if (lint) {
    fs.writeFileSync(
      path.join(data, "lint.json"),
      `${JSON.stringify(lint, null, 2)}\n`,
      "utf8"
    );
  }
}

/**
 * Publica la app web con un snapshot dentro.
 *
 * Copia el build de `apps/web` (el del paquete o el del repo) a un directorio y
 * deja `data/snapshot.cc.json` al lado. El resultado se sirve desde cualquier
 * estático (Pages, un `npx serve`, el propio `codarch serve`): no necesita node ni
 * el CLI. La app es la misma en las tres plataformas (ADR 0073).
 */
export function runRender(options: RenderCommandOptions): number {
  if (!options.file) {
    console.error(
      "falta la ruta del fichero cc.json\n\n  codarch render <fichero.cc.json[.gz]> [-o <directorio>]"
    );
    return 1;
  }

  let loaded;
  try {
    loaded = readJsonFile(options.file);
  } catch (error) {
    console.error(`no se pudo leer ${options.file}: ${(error as Error).message}`);
    return 1;
  }

  let cc;
  try {
    cc = parseCcJson(loaded.json);
  } catch (error) {
    if (error instanceof CcJsonError) {
      console.error(`cc.json inválido: ${error.message}`);
      return 1;
    }
    throw error;
  }

  const webRoot = findWebRoot();
  if (!webRoot) {
    console.error(
      "no se encontró el build de la app web. Ejecuta `npm run web:build` (o usa el paquete publicado)."
    );
    return 1;
  }

  const started = Date.now();
  const out = options.out ?? defaultOutputPath(options.file);
  const lint = readLintBeside(options.file);
  try {
    publishSnapshot(cc, out, webRoot, lint);
  } catch (error) {
    console.error(`no se pudo escribir ${out}: ${(error as Error).message}`);
    return 1;
  }
  const elapsed = Date.now() - started;

  let files = 0;
  walkFiles(cc.files, () => {
    files += 1;
  });

  const lines: string[] = [];
  lines.push("");
  lines.push("  CodArch · app publicada");
  lines.push("");
  lines.push(field("fichero", `${options.file} (${formatBytes(loaded.bytes)})`));
  lines.push(field("salida", out));
  lines.push(field("servir", `npx serve "${out}"`));
  lines.push(field("snapshot", path.join(out, "data", "snapshot.cc.json")));
  lines.push(field("estructura", `${num(files)} ficheros`));
  if (cc.meta.projectName) {
    lines.push(field("proyecto", cc.meta.projectName));
  }
  lines.push(field("tiempo", `${num(elapsed)} ms`));
  lines.push("");
  console.log(lines.join("\n"));
  return 0;
}
