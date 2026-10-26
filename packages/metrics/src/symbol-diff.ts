import type { CcSymbol } from "@codarch/schema";
import type { IndexedSnapshot } from "./diff";

/**
 * El diff de símbolos: qué pasó dentro de los ficheros.
 *
 * El diff de ficheros dice "has tocado `parse.ts`". Este dice "has cambiado
 * `parseDiff`: la complejidad pasó de 12 a 18" ✓, que es lo que un revisor
 * quiere leer ✓.
 *
 * En M12 el emparejamiento es por nombre (dentro del mismo fichero ✓): el caso
 * común ✓. Reconocer un renombrado o una mudanza es trabajo de la cadena
 * (ADR 0026 ✓).
 *
 * Un símbolo cambia cuando cambia su tipo, su complejidad, sus líneas o el
 * hash de su cuerpo (ADR 0063 ✓): una constante que pasa de `10` a `20` sin
 * cambiar de tamaño también es un cambio ✓.
 */

/** Un símbolo en uno de los dos lados. */
export interface SymbolSnapshot {
  complexity: number | null;
  lines: number | null;
  /** Línea 1-based dentro del fichero. */
  line: number;
}

/** Un símbolo y lo que pasó con él. */
export interface DiffSymbolChange {
  name: string;
  kind: CcSymbol["kind"];
  status: "added" | "removed" | "changed";
  /** El símbolo en la base; `null` si es nuevo. */
  base: SymbolSnapshot | null;
  /** El símbolo en el head; `null` si se eliminó. */
  head: SymbolSnapshot | null;
  /** `head - base` de la complejidad; `null` si no se puede comparar. */
  complexityDelta: number | null;
}

/** Los símbolos que cambiaron en un fichero. */
export interface DiffSymbolFile {
  id: string;
  path: string;
  symbols: DiffSymbolChange[];
}

export interface DiffSymbolReport {
  /** Los ficheros con símbolos tocados, con más cambios primero. */
  files: DiffSymbolFile[];
  summary: {
    added: number;
    removed: number;
    changed: number;
    /** El fichero donde más ha cambiado el interior. */
    topFile: { path: string; changed: number } | null;
  };
}

/**
 * Compara la lente de símbolos entre la base y el head.
 *
 * Devuelve `null` si ninguno de los dos lados la trae: lo que no se midió se
 * dice con `null`, no con ceros inventados ✓.
 */
export function buildSymbolReport(
  base: IndexedSnapshot,
  head: IndexedSnapshot,
  top: number
): DiffSymbolReport | null {
  const baseLens = base.cc.lenses?.symbols;
  const headLens = head.cc.lenses?.symbols;
  if (!baseLens && !headLens) return null;

  const files: DiffSymbolFile[] = [];
  let added = 0;
  let removed = 0;
  let changed = 0;

  for (const id of head.nodes) {
    const headSymbols = headLens?.nodes[id] ?? [];
    const baseSymbols = baseLens?.nodes[id] ?? [];
    if (headSymbols.length === 0 && baseSymbols.length === 0) continue;

    const symbols = compareSymbols(baseSymbols, headSymbols);
    if (symbols.length === 0) continue;

    for (const symbol of symbols) {
      if (symbol.status === "added") added++;
      else if (symbol.status === "removed") removed++;
      else changed++;
    }

    files.push({
      id,
      path: head.paths.get(id) ?? id,
      symbols
    });
  }

  // Los ficheros que solo están en la base: sus símbolos se fueron con ellos.
  for (const id of base.nodes) {
    if (head.paths.has(id)) continue;
    const baseSymbols = baseLens?.nodes[id] ?? [];
    if (baseSymbols.length === 0) continue;

    const symbols = baseSymbols.map((symbol) => ({
      name: symbol.name,
      kind: symbol.kind,
      status: "removed" as const,
      base: snapshotOf(symbol),
      head: null,
      complexityDelta: null
    }));
    removed += symbols.length;

    files.push({
      id,
      path: base.paths.get(id) ?? id,
      symbols
    });
  }

  files.sort(
    (left, right) =>
      right.symbols.length - left.symbols.length ||
      left.path.localeCompare(right.path)
  );

  const topFile = files[0]
    ? { path: files[0].path, changed: files[0].symbols.length }
    : null;

  return {
    files: files.slice(0, top),
    summary: { added, removed, changed, topFile }
  };
}

/**
 * Compara los símbolos de un fichero, emparejando por nombre.
 *
 * Un fichero puede tener varios símbolos con el mismo nombre —dos
 * `listener` anidados, el constructor de dos clases—: se emparejan por orden
 * de aparición. Guardar solo uno hacía que el otro apareciera como cambiado
 * en un fichero que nadie había tocado (ADR 0076).
 */
function compareSymbols(
  base: readonly CcSymbol[],
  head: readonly CcSymbol[]
): DiffSymbolChange[] {
  const changes: DiffSymbolChange[] = [];
  const baseByName = new Map<string, CcSymbol[]>();
  for (const symbol of base) {
    const list = baseByName.get(symbol.name);
    if (list) list.push(symbol);
    else baseByName.set(symbol.name, [symbol]);
  }

  for (const symbol of head) {
    const before = baseByName.get(symbol.name)?.shift();
    if (!before) {
      changes.push({
        name: symbol.name,
        kind: symbol.kind,
        status: "added",
        base: null,
        head: snapshotOf(symbol),
        complexityDelta: null
      });
      continue;
    }

    const touched =
      before.kind !== symbol.kind ||
      before.complexity !== symbol.complexity ||
      before.lines !== symbol.lines ||
      before.hash !== symbol.hash;
    if (!touched) continue;

    changes.push({
      name: symbol.name,
      kind: symbol.kind,
      status: "changed",
      base: snapshotOf(before),
      head: snapshotOf(symbol),
      complexityDelta: delta(before.complexity, symbol.complexity)
    });
  }

  for (const symbols of baseByName.values()) {
    for (const symbol of symbols) {
      changes.push({
        name: symbol.name,
        kind: symbol.kind,
        status: "removed",
        base: snapshotOf(symbol),
        head: null,
        complexityDelta: null
      });
    }
  }

  return changes;
}

function snapshotOf(symbol: CcSymbol): SymbolSnapshot {
  return {
    complexity: symbol.complexity ?? null,
    lines: symbol.lines ?? null,
    line: symbol.line
  };
}

function delta(base: number | undefined, head: number | undefined): number | null {
  if (base === undefined || head === undefined) return null;
  return head - base;
}
