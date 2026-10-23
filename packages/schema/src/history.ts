/**
 * La línea del tiempo de un repositorio.
 *
 * Cada análisis guardado es un snapshot (determinista, sin timestamps ✓) y el
 * índice dice cuándo se guardó. La fecha vive en el índice, nunca dentro del
 * snapshot: el mismo código tiene que dar siempre el mismo checksum.
 *
 * El índice es un JSON pequeño y legible; los snapshots van en ficheros
 * aparte, para que un diff de git no mezcle dos fotos.
 */

import { HISTORY_VERSION } from "@codarch/versions";

export { HISTORY_VERSION };

export interface HistoryEntry {
  /** Fecha ISO del análisis. */
  date: string;
  /** Checksum del snapshot. */
  checksum: string;
  /** Commit del repositorio, si lo hay. */
  commit: string;
  /** Ficheros de la foto. */
  files: number;
  /** Líneas de código de la foto. */
  rloc: number;
  /** Deuda de migración de la foto. */
  debt: number;
  /** Suma de commits: el calor del repo en ese momento. */
  commits: number;
  /** Suma de autores distintos. */
  authors: number;
  /** Los ficheros más tocados en ese momento. */
  hottest: HistoryHotFile[];
}

export interface HistoryHotFile {
  path: string;
  commits: number;
  authors: number;
}

export interface HistoryIndex {
  version: typeof HISTORY_VERSION;
  entries: HistoryEntry[];
}

/** Nombre del fichero de un snapshot dentro del historial. */
export function historyFileName(entry: {
  date: string;
  checksum: string;
}): string {
  const stamp = entry.date.replace(/[:.]/g, "-").replace("Z", "");
  return `${stamp}-${entry.checksum.slice(0, 8)}.cc.json`;
}

export function emptyHistoryIndex(): HistoryIndex {
  return { version: HISTORY_VERSION, entries: [] };
}

/** Lee el índice. Un índice que no se entiende se ignora en vez de romper. */
export function parseHistoryIndex(raw: unknown): HistoryIndex {
  if (typeof raw !== "object" || raw === null) return emptyHistoryIndex();
  const index = raw as Partial<HistoryIndex>;
  if (index.version !== HISTORY_VERSION) return emptyHistoryIndex();
  if (!Array.isArray(index.entries)) return emptyHistoryIndex();
  const entries = index.entries.filter(isEntry);
  return { version: HISTORY_VERSION, entries };
}

function isEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<HistoryEntry>;
  return (
    typeof entry.date === "string" &&
    typeof entry.checksum === "string" &&
    typeof entry.files === "number"
  );
}

/** Añade una entrada al final y ordena por fecha. */
export function addHistoryEntry(
  index: HistoryIndex,
  entry: HistoryEntry
): HistoryIndex {
  const entries = [
    ...index.entries.filter((existing) => existing.checksum !== entry.checksum),
    entry
  ].sort((left, right) => left.date.localeCompare(right.date));
  return { version: HISTORY_VERSION, entries };
}
