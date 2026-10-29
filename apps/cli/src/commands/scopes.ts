import path from "node:path";
import { loadProjectIgnore } from "../config";
import { directoryProblem } from "../io";
import {
  readScopeRegister,
  scopeRows,
  scopeState,
  scopesFile,
  type ScopeRow
} from "../scopes";

/**
 * Los `.codarch/` que viven por debajo de esta raíz.
 *
 * El padre lee hacia abajo (ADR 0089): al analizar apunta qué vio de cada
 * alcance anidado, y aquí se compara con lo que hay ahora. Un alcance «se
 * analizó otra vez» cuando su checksum cambió desde la última vez que el padre
 * lo vio; «nuevo» si no estaba en el registro; y lleva el aviso «ficheros más
 * nuevos» cuando su snapshot es anterior a algún fichero de su carpeta.
 */

export interface ScopesCommandOptions {
  root?: string;
  json: boolean;
  help: boolean;
}

const numberFormat = new Intl.NumberFormat("es-ES");

function num(value: number): string {
  return numberFormat.format(value);
}

/** La fecha del historial, sin segundos ni zona: `2026-10-26 20:11`. */
function shortDate(date: string | undefined): string {
  return date === undefined ? "—" : date.slice(0, 16).replace("T", " ");
}

function estado(row: ScopeRow): string {
  const state = scopeState(row);
  return row.stale ? `${state} · ficheros más nuevos` : state;
}

export function runScopes(options: ScopesCommandOptions): number {
  const root = path.resolve(options.root ?? ".");
  const problem = directoryProblem(root);
  if (problem) {
    console.error(`alcances: ${problem}`);
    return 1;
  }

  const outDirectory = path.join(root, ".codarch");
  const rows = scopeRows(root, readScopeRegister(outDirectory), projectIgnore(root));

  if (options.json) {
    console.log(JSON.stringify(jsonOf(rows), null, 2));
    return 0;
  }

  printScopes(rows, outDirectory);
  return 0;
}

/** Un `.codarch.yml` ilegible no impide listar: se mira sin sus exclusiones. */
function projectIgnore(root: string): string[] {
  try {
    return loadProjectIgnore(root);
  } catch {
    return [];
  }
}

/** Lo que se imprime con `--json`: la tabla con su estado ya resuelto. */
function jsonOf(rows: readonly ScopeRow[]): {
  scopes: Array<ScopeRow & { state: string }>;
} {
  return { scopes: rows.map((row) => ({ ...row, state: scopeState(row) })) };
}

function printScopes(rows: readonly ScopeRow[], outDirectory: string): void {
  console.log("");
  console.log("  CodArch · alcances anidados");
  console.log("");

  if (rows.length === 0) {
    printEmpty();
    return;
  }

  printTable(rows);
  printSummary(rows, outDirectory);
}

/** Sin alcances debajo, se dice cómo nace uno. */
function printEmpty(): void {
  console.log("  No hay ningún .codarch/ por debajo de esta raíz.");
  console.log("");
  console.log(
    "  Un alcance nace analizando su carpeta: codarch analyze apps/desktop"
  );
  console.log("");
}

function printTable(rows: readonly ScopeRow[]): void {
  console.log(
    `  ${"alcance".padEnd(24)}${"ficheros".padStart(9)}  checksum  fecha              estado`
  );
  for (const row of rows) {
    console.log(
      `  ${row.path.padEnd(24)}${num(row.files).padStart(9)}  ${row.checksum.slice(
        0,
        8
      )}  ${shortDate(row.date).padEnd(17)}${estado(row)}`
    );
  }
  console.log("");
}

/** Cuántos alcances hay, dónde queda el registro y qué conviene mirar. */
function printSummary(
  rows: readonly ScopeRow[],
  outDirectory: string
): void {
  console.log(
    `  ${num(rows.length)} ${
      rows.length === 1 ? "alcance" : "alcances"
    } · registro en ${path.relative(process.cwd(), scopesFile(outDirectory))}`
  );

  const warning = warningLine(rows);
  if (warning) console.log(`  Aviso: ${warning}.`);
  console.log("");
}

/** Los avisos de la tabla, o `null` si no hay de qué avisar. */
function warningLine(rows: readonly ScopeRow[]): string | null {
  const changed = rows.filter((row) => row.changed).length;
  const stale = rows.filter((row) => row.stale).length;

  const notes: string[] = [];
  if (changed > 0) {
    notes.push(`${num(changed)} con otro checksum que cuando lo vio el padre`);
  }
  if (stale > 0) {
    notes.push(`${num(stale)} con ficheros más nuevos que su snapshot`);
  }

  return notes.length === 0 ? null : notes.join(" · ");
}
