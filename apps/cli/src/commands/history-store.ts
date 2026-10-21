import fs from "node:fs";
import path from "node:path";
import {
  addHistoryEntry,
  emptyHistoryIndex,
  historyFileName,
  parseHistoryIndex,
  walkFiles,
  type CcJson,
  type HistoryEntry,
  type HistoryIndex
} from "@codarch/schema";

/**
 * El historial de un repositorio: la línea del tiempo de su arquitectura.
 *
 * Vive en `.codarch-history/`, en la raíz del repo, y **fuera** de
 * `.codarch/` a propósito: ahí están los artefactos locales (ignorados por
 * git) y la historia es justo lo que un equipo quiere compartir.
 */

export const HISTORY_DIR = ".codarch-history";
export const HISTORY_INDEX = "index.json";

export interface HistoryLocation {
  directory: string;
  indexFile: string;
}

export function historyLocation(root: string): HistoryLocation {
  const directory = path.join(root, HISTORY_DIR);
  return { directory, indexFile: path.join(directory, HISTORY_INDEX) };
}

/** Lee el índice del historial; si no hay o no se entiende, uno vacío. */
export function readHistoryIndex(root: string): HistoryIndex {
  try {
    const raw = fs.readFileSync(historyLocation(root).indexFile, "utf8");
    return parseHistoryIndex(JSON.parse(raw) as unknown);
  } catch {
    return emptyHistoryIndex();
  }
}

/** Los recuentos que se guardan en el índice. */
export function summarizeSnapshot(cc: CcJson): {
  files: number;
  rloc: number;
  debt: number;
  commits: number;
  authors: number;
  hottest: Array<{ path: string; commits: number; authors: number }>;
} {
  const attributes = cc.lenses?.metrics?.attributes ?? {};
  const paths = new Map<string, string>();
  collectPaths(cc, paths);

  let files = 0;
  let rloc = 0;
  let commits = 0;
  let authors = 0;
  const hot: Array<{ path: string; commits: number; authors: number }> = [];

  for (const [id, metrics] of Object.entries(attributes)) {
    files += 1;
    rloc += metrics.rloc ?? 0;
    const fileCommits = metrics.number_of_commits ?? 0;
    const fileAuthors = metrics.number_of_authors ?? 0;
    commits += fileCommits;
    authors += fileAuthors;
    if (fileCommits > 0) {
      hot.push({
        path: paths.get(id) ?? id,
        commits: fileCommits,
        authors: fileAuthors
      });
    }
  }

  hot.sort(
    (left, right) =>
      right.commits - left.commits || left.path.localeCompare(right.path)
  );

  return {
    files,
    rloc,
    debt: cc.lenses?.migration?.summary?.migrationDebt ?? 0,
    commits,
    authors,
    hottest: hot.slice(0, 10)
  };
}

function collectPaths(cc: CcJson, into: Map<string, string>): void {
  for (const root of cc.files) {
    walkFiles([root], (entry) => {
      // La ruta relativa, sin el nombre de la raíz: como en el diff.
      const prefix = `${root.name}/`;
      const relative = entry.path.startsWith(prefix)
        ? entry.path.slice(prefix.length)
        : entry.path;
      into.set(entry.node.id, relative);
    });
  }
}

/**
 * Guarda el snapshot en el historial y actualiza el índice.
 *
 * Devuelve la entrada creada o la que ya había si el checksum no cambió: el
 * snapshot es determinista, así que el mismo código da la misma foto.
 */
export function saveHistory(
  root: string,
  cc: CcJson,
  now: Date
): { entry: HistoryEntry; saved: boolean; file: string } {
  const checksum = cc.meta.checksum ?? "";
  const summary = summarizeSnapshot(cc);
  const entry: HistoryEntry = {
    date: now.toISOString(),
    checksum,
    commit: cc.meta.commitHash ?? "",
    ...summary
  };

  const index = readHistoryIndex(root);
  const existing = index.entries.find((item) => item.checksum === checksum);
  if (existing) {
    return { entry: existing, saved: false, file: "" };
  }

  const location = historyLocation(root);
  fs.mkdirSync(location.directory, { recursive: true });
  const file = historyFileName(entry);
  fs.writeFileSync(
    path.join(location.directory, file),
    `${JSON.stringify(cc, null, 2)}\n`,
    "utf8"
  );

  const updated = addHistoryEntry(index, entry);
  fs.writeFileSync(
    location.indexFile,
    `${JSON.stringify(updated, null, 2)}\n`,
    "utf8"
  );

  return { entry, saved: true, file };
}
