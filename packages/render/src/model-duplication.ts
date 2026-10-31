import type { CcJson } from "@codarch/schema/browser";
import type {
  RenderDuplication,
  RenderDuplicationPair,
  RenderFile
} from "./model-types";

/**
 * La lente de duplicación en el modelo (ADR 0102).
 *
 * El snapshot ya la trae medida; aquí solo se cruza con los ficheros del mapa
 * para que la ficha pueda leer sus pares sin volver al cc.json. Las rutas de la
 * lente son del repo y las del modelo pueden llevar la raíz quitada, así que la
 * única traducción es esa.
 */

/** La duplicación vacía: un snapshot anterior a la lente está sin medir. */
export function emptyDuplication(): RenderDuplication {
  return {
    measured: false,
    nodes: {},
    pairsByNode: {},
    pairs: 0,
    duplicatedLines: 0,
    repeatedLines: 0
  };
}

/** Cruza la lente con los ficheros del modelo, sin inventar lo que no trae. */
export function collectDuplication(
  cc: CcJson,
  files: readonly RenderFile[],
  prefix: string
): RenderDuplication {
  const lens = cc.lenses?.duplication;
  if (!lens) return emptyDuplication();

  const strip = (path: string): string =>
    prefix && path.startsWith(prefix) ? path.slice(prefix.length) : path;

  const paths = new Map(files.map((file) => [file.nodeId, file.path]));
  const nodes: RenderDuplication["nodes"] = {};
  let duplicatedLines = 0;
  let repeatedLines = 0;

  for (const [id, node] of Object.entries(lens.nodes)) {
    if (!paths.has(id)) continue;
    nodes[id] = {
      duplicatedLines: node.duplicatedLines,
      repeatedLines: node.repeatedLines,
      duplicateOf: node.duplicateOf ? strip(node.duplicateOf) : null
    };
    duplicatedLines += node.duplicatedLines;
    repeatedLines += node.repeatedLines;
  }

  const pairsByNode: Record<string, RenderDuplicationPair[]> = {};
  for (const pair of lens.pairs) {
    const from = paths.get(pair.fromId);
    const to = paths.get(pair.toId);
    if (from === undefined || to === undefined) continue;
    addPair(pairsByNode, pair.fromId, {
      path: to,
      lines: pair.lines,
      similarity: pair.similarity,
      status: pair.status
    });
    addPair(pairsByNode, pair.toId, {
      path: from,
      lines: pair.lines,
      similarity: pair.similarity,
      status: pair.status
    });
  }

  for (const list of Object.values(pairsByNode)) list.sort(comparePairs);

  return {
    measured: true,
    nodes,
    pairsByNode,
    pairs: lens.pairs.length,
    duplicatedLines,
    repeatedLines
  };
}

function addPair(
  pairsByNode: Record<string, RenderDuplicationPair[]>,
  id: string,
  pair: RenderDuplicationPair
): void {
  const list = pairsByNode[id];
  if (list) list.push(pair);
  else pairsByNode[id] = [pair];
}

/** El par más parecido primero; la ruta desempata para que sea determinista. */
function comparePairs(
  left: RenderDuplicationPair,
  right: RenderDuplicationPair
): number {
  return (
    right.similarity - left.similarity ||
    right.lines - left.lines ||
    (left.path < right.path ? -1 : left.path > right.path ? 1 : 0)
  );
}
