import type { CcJson } from "@codarch/schema/browser";
import type {
  RenderDuplication,
  RenderDuplicationPair,
  RenderDuplicationPairRow,
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
    list: [],
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
  const list: RenderDuplication["list"] = [];
  for (const pair of lens.pairs) {
    const from = paths.get(pair.fromId);
    const to = paths.get(pair.toId);
    if (from === undefined || to === undefined) continue;
    list.push({
      from,
      to,
      lines: pair.lines,
      similarity: pair.similarity,
      status: pair.status
    });
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

  list.sort(comparePairs);
  for (const nodePairs of Object.values(pairsByNode)) {
    nodePairs.sort(compareNodePairs);
  }

  return {
    measured: true,
    nodes,
    pairsByNode,
    list,
    pairs: list.length,
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

/** El par más parecido primero; las líneas y las dos rutas desempatan (M70). */
function comparePairs(
  left: RenderDuplicationPairRow,
  right: RenderDuplicationPairRow
): number {
  return (
    right.similarity - left.similarity ||
    right.lines - left.lines ||
    comparePaths(left.from, right.from) ||
    comparePaths(left.to, right.to)
  );
}

/** El mismo orden desde un fichero: la ruta del otro lado es la que desempata. */
function compareNodePairs(
  left: RenderDuplicationPair,
  right: RenderDuplicationPair
): number {
  return (
    right.similarity - left.similarity ||
    right.lines - left.lines ||
    comparePaths(left.path, right.path)
  );
}

function comparePaths(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
