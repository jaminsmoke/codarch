import type { CcDuplicationLens } from "@codarch/schema";
import type {
  DuplicationChangeKind,
  DuplicationPairChange,
  DuplicationReport,
  DuplicationSide,
  IndexedSnapshot
} from "./diff-types";
import { compareStrings } from "./diff-shared";

/**
 * Cómo ha cambiado el código copiado entre la base y el head (ADR 0102, M71).
 *
 * La lente mide pares de ficheros, así que el diff los compara por las **dos
 * rutas**, no por id: un par sigue siendo el mismo cuando los dos ficheros
 * siguen siendo los mismos. Un lado sin lente no es un cero; es un lado sin
 * medir, y con uno solo no hay comparación que valga.
 */
export function buildDuplicationReport(
  baseIndex: IndexedSnapshot,
  headIndex: IndexedSnapshot,
  top: number
): DuplicationReport | null {
  const baseLens = baseIndex.cc.lenses?.duplication;
  const headLens = headIndex.cc.lenses?.duplication;
  // Sin la lente en ningún lado no hay nada que contar: `null`, no ceros.
  if (!baseLens && !headLens) return null;

  const base = baseLens ? side(baseLens) : null;
  const head = headLens ? side(headLens) : null;
  const lines = {
    base: base?.duplicatedLines ?? null,
    head: head?.duplicatedLines ?? null,
    delta:
      base && head ? head.duplicatedLines - base.duplicatedLines : null
  };

  // Un solo lado medido: se enseña lo que hay y se dice que no se compara.
  if (!baseLens || !headLens) {
    return {
      base,
      head,
      lines,
      counts: { added: 0, removed: 0, diverging: 0 },
      added: [],
      removed: [],
      diverging: []
    };
  }

  const basePairs = pairsOf(baseLens, baseIndex);
  const headPairs = pairsOf(headLens, headIndex);
  const added: DuplicationPairChange[] = [];
  const removed: DuplicationPairChange[] = [];
  const diverging: DuplicationPairChange[] = [];

  for (const [key, pair] of headPairs) {
    const before = basePairs.get(key);
    if (!before) {
      added.push(change("added", pair, null));
      continue;
    }
    // La copia que se separa: sigue compartiendo, pero menos que antes. La que
    // se vuelve a juntar no es noticia y no se lista.
    if (pair.similarity < before.similarity) {
      diverging.push(change("diverging", pair, before));
    }
  }
  for (const [key, pair] of basePairs) {
    if (!headPairs.has(key)) removed.push(change("removed", pair, null));
  }

  added.sort(byLines);
  diverging.sort(bySplit);
  removed.sort(byLines);

  return {
    base,
    head,
    lines,
    counts: {
      added: added.length,
      removed: removed.length,
      diverging: diverging.length
    },
    added: added.slice(0, top),
    removed: removed.slice(0, top),
    diverging: diverging.slice(0, top)
  };
}

/** Un par con sus rutas resueltas y su clave, para cruzar base y head. */
interface PairRef {
  from: string;
  to: string;
  lines: number;
  similarity: number;
}

function pairsOf(
  lens: CcDuplicationLens,
  index: IndexedSnapshot
): Map<string, PairRef> {
  const pairs = new Map<string, PairRef>();
  for (const pair of lens.pairs) {
    const from = index.paths.get(pair.fromId);
    const to = index.paths.get(pair.toId);
    // Un extremo que el snapshot del lado no tiene no se puede comparar.
    if (from === undefined || to === undefined) continue;
    pairs.set(pairKey(from, to), {
      from,
      to,
      lines: pair.lines,
      similarity: pair.similarity
    });
  }
  return pairs;
}

/** La clave del par sin importar el orden: es el mismo fichero a los dos lados. */
function pairKey(from: string, to: string): string {
  return from < to ? `${from}\u0000${to}` : `${to}\u0000${from}`;
}

function change(
  kind: DuplicationChangeKind,
  pair: PairRef,
  before: PairRef | null
): DuplicationPairChange {
  return {
    from: pair.from,
    to: pair.to,
    kind,
    lines: pair.lines,
    similarity: pair.similarity,
    previousSimilarity: before?.similarity ?? null,
    linesDelta: before ? pair.lines - before.lines : null
  };
}

/** Los pares más grandes primero; las rutas desempatan. */
function byLines(left: DuplicationPairChange, right: DuplicationPairChange): number {
  return (
    right.lines - left.lines ||
    right.similarity - left.similarity ||
    compareStrings(left.from, right.from) ||
    compareStrings(left.to, right.to)
  );
}

/** El que más se ha separado primero, que es el que pide una decisión. */
function bySplit(left: DuplicationPairChange, right: DuplicationPairChange): number {
  const leftDrop = (left.previousSimilarity ?? left.similarity) - left.similarity;
  const rightDrop =
    (right.previousSimilarity ?? right.similarity) - right.similarity;
  return (
    rightDrop - leftDrop ||
    right.lines - left.lines ||
    compareStrings(left.from, right.from) ||
    compareStrings(left.to, right.to)
  );
}

function side(lens: CcDuplicationLens): DuplicationSide {
  return {
    pairs: lens.summary.pairs,
    copies: lens.summary.copies,
    duplicatedLines: lens.summary.duplicatedLines,
    repeatedLines: lens.summary.repeatedLines
  };
}
