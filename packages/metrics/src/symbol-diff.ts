import type { CcSymbol, CcSymbolsLens } from "@codarch/schema";
import type { IndexedSnapshot } from "./diff";
import { countLineChanges } from "./line-diff";

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
  /**
   * Las líneas que añade el símbolo, medidas sobre su cuerpo.
   *
   * Es `null` cuando no hay con qué medirlas: un reporte hecho desde dos
   * `cc.json` no lleva código fuente, y lo que no se midió no se inventa.
   */
  addedLines: number | null;
  /** Las líneas que quita el símbolo; `null` si no se midieron. */
  removedLines: number | null;
}

/**
 * El texto de cada lado, para poder medir líneas.
 *
 * Lo inyecta quien tiene los ficheros a mano —la comparación HEAD, que tiene la
 * base exportada y el árbol—: el diff sigue siendo puro sobre dos snapshots, y
 * desde dos `cc.json` sueltos simplemente falta ✓.
 */
export type FileSource = (side: "base" | "head", path: string) => string | null;

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
  top: number,
  source?: FileSource
): DiffSymbolReport | null {
  const baseLens = base.cc.lenses?.symbols;
  const headLens = head.cc.lenses?.symbols;
  if (!baseLens && !headLens) return null;

  const files = [
    ...changedFiles(base, head, baseLens, headLens, new BodyReader(source)),
    // Los ficheros que solo están en la base: sus símbolos se fueron con ellos.
    ...vanishedFiles(base, head, baseLens)
  ].sort(byChanges);

  return {
    files: budgeted(files, top),
    summary: { ...totals(files), topFile: topFile(files) }
  };
}

/** Los ficheros de los dos lados, con los símbolos que cambiaron dentro. */
function changedFiles(
  base: IndexedSnapshot,
  head: IndexedSnapshot,
  baseLens: CcSymbolsLens | undefined,
  headLens: CcSymbolsLens | undefined,
  reader: BodyReader
): DiffSymbolFile[] {
  const files: DiffSymbolFile[] = [];

  for (const id of head.nodes) {
    const path = head.paths.get(id) ?? id;
    const symbols = compareSymbols(
      baseLens?.nodes[id] ?? [],
      headLens?.nodes[id] ?? [],
      path,
      reader
    );
    if (symbols.length > 0) files.push({ id, path, symbols });
  }

  return files;
}

/** Los ficheros que desaparecieron: sus símbolos cuentan como quitados. */
function vanishedFiles(
  base: IndexedSnapshot,
  head: IndexedSnapshot,
  baseLens: CcSymbolsLens | undefined
): DiffSymbolFile[] {
  const files: DiffSymbolFile[] = [];

  for (const id of base.nodes) {
    if (head.paths.has(id)) continue;
    const symbols = (baseLens?.nodes[id] ?? []).map(removedChange);
    if (symbols.length > 0) {
      files.push({ id, path: base.paths.get(id) ?? id, symbols });
    }
  }

  return files;
}

/** Más cambios primero; a igualdad, por ruta, para que el orden no baile. */
function byChanges(left: DiffSymbolFile, right: DiffSymbolFile): number {
  return (
    right.symbols.length - left.symbols.length ||
    left.path.localeCompare(right.path)
  );
}

/** Lo que suma el interior de cada fichero, contado sobre lo ya comparado. */
function totals(files: readonly DiffSymbolFile[]): {
  added: number;
  removed: number;
  changed: number;
} {
  const summary = { added: 0, removed: 0, changed: 0 };

  for (const file of files) {
    for (const symbol of file.symbols) {
      if (symbol.status === "added") summary.added++;
      else if (symbol.status === "removed") summary.removed++;
      else summary.changed++;
    }
  }

  return summary;
}

/** El fichero donde más cambió el interior, si hay alguno. */
function topFile(
  files: readonly DiffSymbolFile[]
): { path: string; changed: number } | null {
  const first = files[0];
  return first ? { path: first.path, changed: first.symbols.length } : null;
}

/**
 * El corte del reporte: por ficheros, y también por cambios.
 *
 * Un repo con miles de símbolos tocados no puede inflar el reporte; las cifras
 * del resumen siguen contando todo lo que hay en `files`.
 */
function budgeted(
  files: readonly DiffSymbolFile[],
  top: number
): DiffSymbolFile[] {
  const shown: DiffSymbolFile[] = [];
  let left = MAX_SYMBOL_CHANGES;

  for (const file of files.slice(0, top)) {
    if (shown.length > 0 && left <= 0) break;
    shown.push(file);
    left -= file.symbols.length;
  }

  return shown;
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
  head: readonly CcSymbol[],
  path: string,
  reader: BodyReader
): DiffSymbolChange[] {
  const changes: DiffSymbolChange[] = [];
  const pending = byName(base);

  for (const symbol of head) {
    const before = pending.get(symbol.name)?.shift();
    if (!before) {
      changes.push(addedChange(symbol));
      continue;
    }
    if (!touched(before, symbol)) continue;
    changes.push(changedChange(before, symbol, path, reader));
  }

  for (const symbols of pending.values()) {
    for (const symbol of symbols) changes.push(removedChange(symbol));
  }

  return changes;
}

/** Los símbolos de la base por nombre, en orden de aparición. */
function byName(base: readonly CcSymbol[]): Map<string, CcSymbol[]> {
  const byName = new Map<string, CcSymbol[]>();

  for (const symbol of base) {
    const list = byName.get(symbol.name);
    if (list) list.push(symbol);
    else byName.set(symbol.name, [symbol]);
  }

  return byName;
}

/** Si algo del símbolo cambió: tipo, complejidad, líneas o cuerpo (ADR 0063). */
function touched(before: CcSymbol, head: CcSymbol): boolean {
  return (
    before.kind !== head.kind ||
    before.complexity !== head.complexity ||
    before.lines !== head.lines ||
    before.hash !== head.hash
  );
}

/** Un símbolo nuevo: suma todo lo que ocupa y no quita nada. */
function addedChange(symbol: CcSymbol): DiffSymbolChange {
  return {
    name: symbol.name,
    kind: symbol.kind,
    status: "added",
    base: null,
    head: snapshotOf(symbol),
    complexityDelta: null,
    addedLines: symbol.lines ?? null,
    removedLines: symbol.lines === undefined ? null : 0
  };
}

/** Un símbolo que se va: quita todo lo que ocupaba. */
function removedChange(symbol: CcSymbol): DiffSymbolChange {
  return {
    name: symbol.name,
    kind: symbol.kind,
    status: "removed",
    base: snapshotOf(symbol),
    head: null,
    complexityDelta: null,
    addedLines: symbol.lines === undefined ? null : 0,
    removedLines: symbol.lines ?? null
  };
}

/** Un símbolo tocado, con las líneas medidas sobre su cuerpo si hay texto. */
function changedChange(
  before: CcSymbol,
  symbol: CcSymbol,
  path: string,
  reader: BodyReader
): DiffSymbolChange {
  const from = snapshotOf(before);
  const to = snapshotOf(symbol);
  const moved = reader.changes(path, from, to);

  return {
    name: symbol.name,
    kind: symbol.kind,
    status: "changed",
    base: from,
    head: to,
    complexityDelta: delta(before.complexity, symbol.complexity),
    addedLines: moved?.added ?? null,
    removedLines: moved?.removed ?? null
  };
}

/** Cuántos cambios de símbolo caben en el reporte, como red de seguridad. */
const MAX_SYMBOL_CHANGES = 2000;

/**
 * Saca el cuerpo de un símbolo de su fichero y lo compara con el otro lado.
 *
 * Cada fichero se lee una vez por lado y se guarda: un fichero con veinte
 * símbolos tocados no son veinte lecturas.
 */
class BodyReader {
  private readonly texts = new Map<string, string | null>();

  constructor(private readonly source?: FileSource) {}

  /** Las líneas que entran y salen, o `null` si no hay texto con el que medir. */
  changes(
    path: string,
    base: SymbolSnapshot,
    head: SymbolSnapshot
  ): { added: number; removed: number } | null {
    const before = this.body("base", path, base);
    const after = this.body("head", path, head);
    if (!before || !after) return null;
    const counted = countLineChanges(before, after);
    return counted && { added: counted.added, removed: counted.removed };
  }

  private body(
    side: "base" | "head",
    path: string,
    snapshot: SymbolSnapshot
  ): string[] | null {
    if (snapshot.lines === null) return null;
    const text = this.text(side, path);
    if (text === null) return null;

    const lines = text.split(/\r?\n/);
    const start = snapshot.line - 1;
    const end = start + snapshot.lines;
    // Un símbolo cuyo rango se sale del fichero no se mide: mejor `null` que
    // un cuerpo cortado a la mitad.
    if (start < 0 || end > lines.length) return null;
    return lines.slice(start, end);
  }

  private text(side: "base" | "head", path: string): string | null {
    const key = `${side}:${path}`;
    const cached = this.texts.get(key);
    if (cached !== undefined) return cached;

    let text: string | null = null;
    try {
      text = this.source?.(side, path) ?? null;
    } catch {
      text = null;
    }
    this.texts.set(key, text);
    return text;
  }
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
