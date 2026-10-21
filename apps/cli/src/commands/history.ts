import path from "node:path";
import { readHistoryIndex, historyLocation } from "./history-store";

/**
 * Lista la línea del tiempo del repositorio: las fotos guardadas con
 * `codarch analyze --history`.
 */

export interface HistoryCommandOptions {
  root?: string;
  json: boolean;
  help: boolean;
}

const numberFormat = new Intl.NumberFormat("es-ES");

function num(value: number): string {
  return numberFormat.format(value);
}

export function runHistory(options: HistoryCommandOptions): number {
  const root = path.resolve(options.root ?? ".");
  const index = readHistoryIndex(root);

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
  return 0;
}
