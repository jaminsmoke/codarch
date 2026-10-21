import fs from "node:fs";
import path from "node:path";
import { CcJsonError, parseCcJson, type CcJson, type HistoryEntry } from "@codarch/schema";
import { compareSnapshots } from "./compare";
import {
  historyLocation,
  readHistoryIndex
} from "@codarch/schema";

/**
 * La línea del tiempo del repositorio.
 *
 * Sin argumentos, lista las fotos guardadas. Con dos, compara dos momentos:
 * es el mismo motor de diff que `codarch diff`, pero entre fotos del historial.
 */

export interface HistoryCommandOptions {
  root?: string;
  json: boolean;
  /** Identificadores de las dos fotos a comparar. */
  from?: string;
  to?: string;
  out?: string;
  help: boolean;
}

const numberFormat = new Intl.NumberFormat("es-ES");

function num(value: number): string {
  return numberFormat.format(value);
}

export function runHistory(options: HistoryCommandOptions): number {
  const root = path.resolve(options.root ?? ".");
  const index = readHistoryIndex(root);

  if (options.from && options.to) {
    return compareEntries(root, index.entries, options.from, options.to, options);
  }

  if (options.json) {
    console.log(JSON.stringify(index, null, 2));
    return 0;
  }

  console.log("");
  console.log("  CodArch · historial del repositorio");
  console.log("");

  if (index.entries.length === 0) {
    console.log("  No hay fotos guardadas todavía.");
    console.log("");
    console.log("  Para guardar una: codarch analyze . --history");
    console.log("");
    return 0;
  }

  console.log(
    `  ${"fecha".padEnd(21)}${"ficheros".padStart(9)}${"rloc".padStart(9)}${"calor".padStart(9)}  checksum`
  );
  for (const entry of index.entries) {
    console.log(
      `  ${entry.date.padEnd(21)}${num(entry.files).padStart(9)}${num(
        entry.rloc
      ).padStart(9)}${num(entry.commits).padStart(9)}  ${entry.checksum.slice(
        0,
        8
      )}`
    );
  }
  console.log("");

  const last = index.entries[index.entries.length - 1];
  if (last && last.hottest.length > 0) {
    console.log("  Ficheros más tocados en la última foto:");
    for (const file of last.hottest.slice(0, 5)) {
      console.log(
        `    ${num(file.commits).padStart(4)} commits · ${num(
          file.authors
        ).padStart(2)} autores  ${file.path}`
      );
    }
    console.log("");
  }

  console.log(`  Historial en ${historyLocation(root).directory}`);
  console.log("");
  console.log("  Para comparar dos momentos: codarch history <fecha> <checksum>");
  console.log("");
  return 0;
}

/** Busca una foto por un trozo de su fecha o de su checksum. */
function findEntry(
  entries: readonly HistoryEntry[],
  token: string
): HistoryEntry | undefined {
  const needle = token.trim().toLowerCase();
  if (needle === "") return undefined;
  return (
    entries.find((entry) => entry.date.toLowerCase().includes(needle)) ??
    entries.find((entry) => entry.checksum.toLowerCase().startsWith(needle))
  );
}

function compareEntries(
  root: string,
  entries: readonly HistoryEntry[],
  fromToken: string,
  toToken: string,
  options: HistoryCommandOptions
): number {
  const from = findEntry(entries, fromToken);
  const to = findEntry(entries, toToken);
  if (!from || !to) {
    console.error(
      `no se encontró la foto: ${!from ? fromToken : toToken}. Mira la línea de tiempo con "codarch history".`
    );
    return 1;
  }

  const directory = historyLocation(root).directory;
  const base = loadEntry(directory, from);
  if (!base) return 1;
  const head = loadEntry(directory, to);
  if (!head) return 1;

  return compareSnapshots(base, head, {
    out: options.out,
    baseLabel: from.date,
    headLabel: to.date,
    title: "historial"
  });
}

function loadEntry(directory: string, entry: HistoryEntry): CcJson | null {
  const file = path.join(directory, fileNameFor(entry));
  let raw: string;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (error) {
    console.error(`no se pudo leer ${file}: ${(error as Error).message}`);
    return null;
  }
  try {
    return parseCcJson(JSON.parse(raw) as unknown);
  } catch (error) {
    if (error instanceof CcJsonError) {
      console.error(`cc.json inválido en ${file}: ${error.message}`);
      return null;
    }
    throw error;
  }
}

function fileNameFor(entry: HistoryEntry): string {
  const stamp = entry.date.replace(/[:.]/g, "-").replace("Z", "");
  return `${stamp}-${entry.checksum.slice(0, 8)}.cc.json`;
}
