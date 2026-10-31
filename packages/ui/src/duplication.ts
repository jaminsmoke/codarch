import type {
  RenderDuplicationPairRow,
  RenderFile,
  RenderModel
} from "@codarch/render/browser";

/**
 * La duplicación de un subárbol (ADR 0102).
 *
 * Las líneas se suman; el porcentaje se calcula al final sobre el `rloc` del
 * subárbol. Dos porcentajes no se suman: la proporción de dos carpetas no es la
 * de su padre. Es la misma regla con la que el snapshot calcula su resumen.
 */

export interface DuplicationRollup {
  /** El snapshot trae la lente; si no, esto está sin medir, no a cero. */
  measured: boolean;
  /** Líneas dentro de bloques compartidos con otro fichero. */
  duplicatedLines: number;
  /** Líneas dentro de bloques repetidos en el mismo fichero. */
  repeatedLines: number;
  /** `rloc` del subárbol, el denominador de la proporción. */
  rloc: number;
  /** 0..100, sobre el rloc del subárbol. */
  ratio: number;
  /** Ficheros con alguna línea duplicada. */
  files: number;
  /** Ficheros del subárbol. */
  total: number;
}

/** El filtro de la lista de pares (M70). */
export type DuplicationStatusFilter = "all" | "copy" | "diverging";

export interface DuplicationPairScope {
  /** Los pares del subárbol que pasan el filtro, en el orden del modelo. */
  rows: RenderDuplicationPairRow[];
  /** Cuántos pares hay de cada estado antes de filtrar. */
  counts: Record<DuplicationStatusFilter, number>;
}

/**
 * Los pares de un subárbol, con su filtro por estado (M70).
 *
 * Un par cuenta en el subárbol solo si sus **dos** extremos están dentro: el que
 * cruza la frontera es del padre, y contarlo en los dos lados sumaría las
 * mismas líneas dos veces. El orden es el del modelo, que ya es determinista.
 */
export function duplicationPairs(
  model: RenderModel,
  files: readonly RenderFile[],
  status: DuplicationStatusFilter = "all"
): DuplicationPairScope {
  const inside = new Set(files.map((file) => file.path));
  const counts: Record<DuplicationStatusFilter, number> = {
    all: 0,
    copy: 0,
    diverging: 0
  };
  const rows: RenderDuplicationPairRow[] = [];

  for (const pair of model.duplication.list) {
    if (!inside.has(pair.from) || !inside.has(pair.to)) continue;
    counts.all += 1;
    counts[pair.status] += 1;
    if (status === "all" || pair.status === status) rows.push(pair);
  }

  return { rows, counts };
}

/** El `rloc` de un fichero, aunque el área del mapa sea otra métrica. */
export function rlocOf(model: RenderModel, file: RenderFile): number {
  const index = model.metrics.findIndex((metric) => metric.key === "rloc");
  if (index < 0) return 0;
  return file.values[index] ?? 0;
}

/** Suma las líneas del subárbol y divide una sola vez por su `rloc`. */
export function duplicationRollup(
  model: RenderModel,
  files: readonly RenderFile[]
): DuplicationRollup {
  let duplicatedLines = 0;
  let repeatedLines = 0;
  let rloc = 0;
  let affected = 0;

  for (const file of files) {
    // El denominador son todos los ficheros del subárbol, tengan lente o no:
    // el rloc del proyecto no se encoge porque un fichero no declare nodo.
    rloc += rlocOf(model, file);
    const node = model.duplication.nodes[file.nodeId];
    if (!node) continue;
    duplicatedLines += node.duplicatedLines;
    repeatedLines += node.repeatedLines;
    if (node.duplicatedLines > 0) affected += 1;
  }

  return {
    measured: model.duplication.measured,
    duplicatedLines,
    repeatedLines,
    rloc,
    ratio: rloc > 0 ? Math.round((duplicatedLines / rloc) * 100) : 0,
    files: affected,
    total: files.length
  };
}
