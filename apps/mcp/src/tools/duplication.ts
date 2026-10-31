// La duplicación: cuánto código se copia, entre quiénes, y qué ha cambiado
// respecto a la base del reporte (ADR 0102, M71).

import type { DuplicationReport } from "@codarch/metrics";
import { ArchitectureStore, type StoreFile } from "../store";
import { clampInteger, compareStrings } from "./helpers";
import type {
  DuplicationChangeView,
  DuplicationPairView,
  DuplicationReportInput,
  DuplicationReportResult
} from "./types";

export function getDuplicationReport(
  store: ArchitectureStore,
  input: DuplicationReportInput = {}
): DuplicationReportResult {
  const limit = clampInteger(input.limit, 20, 1, 100);
  const requested = store.normalizePath(input.path ?? "");
  const target = store.resolveTarget(requested);
  const files = "id" in target ? [target] : store.filesUnder(target.path);
  const inside = new Set(files.map((file) => file.path));

  const lens = store.snapshot.lenses?.duplication;
  if (!lens) {
    return {
      available: false,
      scope: target.path,
      summary: null,
      pairs: [],
      totalPairs: 0,
      changes: {
        available: false,
        reason:
          "el snapshot no tiene la lente de duplicación; analiza con una versión que la incluya"
      },
      reason:
        "la duplicación de este árbol está sin medir: sin lente no es lo mismo que limpio"
    };
  }

  const summary = summarize(store, files, lens.nodes);
  const pairs = pairsInScope(store, inside);
  const changes = changesInScope(store.report?.duplication ?? null, inside, limit);

  return {
    available: true,
    scope: target.path,
    summary,
    pairs: pairs.slice(0, limit),
    totalPairs: pairs.length,
    changes
  };
}

function summarize(
  store: ArchitectureStore,
  files: readonly StoreFile[],
  nodes: Record<string, { duplicatedLines: number; repeatedLines: number }>
): NonNullable<DuplicationReportResult["summary"]> {
  let duplicatedLines = 0;
  let repeatedLines = 0;
  let rloc = 0;
  let affected = 0;

  for (const file of files) {
    // El denominador son todos los ficheros del ámbito, tengan nodo o no.
    rloc += file.metrics.rloc ?? file.size ?? 0;
    const node = nodes[file.id];
    if (!node) continue;
    duplicatedLines += node.duplicatedLines;
    repeatedLines += node.repeatedLines;
    if (node.duplicatedLines > 0) affected += 1;
  }

  return {
    duplicatedLines,
    repeatedLines,
    ratio: rloc > 0 ? Math.round((duplicatedLines / rloc) * 100) : 0,
    files: files.length,
    affected
  };
}

/** Los pares del snapshot con los dos extremos dentro del ámbito. */
function pairsInScope(
  store: ArchitectureStore,
  inside: ReadonlySet<string>
): DuplicationPairView[] {
  const lens = store.snapshot.lenses?.duplication;
  if (!lens) return [];

  const paths = new Map<string, string>();
  for (const file of store.files) paths.set(file.id, file.path);

  const pairs: DuplicationPairView[] = [];
  for (const pair of lens.pairs) {
    const from = paths.get(pair.fromId);
    const to = paths.get(pair.toId);
    if (!from || !to) continue;
    // Como en la app: un par es del subárbol cuando sus dos ficheros están
    // dentro; el que cruza la frontera es del padre.
    if (!inside.has(from) || !inside.has(to)) continue;
    pairs.push({
      from,
      to,
      lines: pair.lines,
      similarity: pair.similarity,
      status: pair.status
    });
  }

  return pairs.sort(
    (left, right) =>
      right.similarity - left.similarity ||
      right.lines - left.lines ||
      compareStrings(left.from, right.from) ||
      compareStrings(left.to, right.to)
  );
}

function changesInScope(
  duplication: DuplicationReport | null,
  inside: ReadonlySet<string>,
  limit: number
): DuplicationReportResult["changes"] {
  if (!duplication) {
    return {
      available: false,
      reason:
        "el reporte no trae la sección de duplicación; se generó con una versión anterior"
    };
  }
  if (
    duplication.lines.delta === null ||
    duplication.lines.base === null ||
    duplication.lines.head === null
  ) {
    return {
      available: false,
      reason: `el reporte no compara la duplicación: falta la lente en ${
        duplication.base ? "el head" : "la base"
      }`
    };
  }

  const keep = (
    entries: DuplicationReport["added"]
  ): DuplicationChangeView[] =>
    entries
      .filter((entry) => inside.has(entry.from) && inside.has(entry.to))
      .map((entry) => ({ ...entry }));

  const added = keep(duplication.added);
  const removed = keep(duplication.removed);
  const diverging = keep(duplication.diverging);

  return {
    available: true,
    lines: {
      base: duplication.lines.base,
      head: duplication.lines.head,
      delta: duplication.lines.delta
    },
    counts: {
      added: added.length,
      removed: removed.length,
      diverging: diverging.length
    },
    added: added.slice(0, limit),
    removed: removed.slice(0, limit),
    diverging: diverging.slice(0, limit)
  };
}
