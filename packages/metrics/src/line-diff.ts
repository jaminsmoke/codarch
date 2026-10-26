/**
 * Cuántas líneas entran y cuántas salen entre dos textos.
 *
 * Es lo que convierte "el símbolo cambió" en `StartFn +10 −4`, que es lo que un
 * revisor quiere leer ✓. No se guarda el diff entero, solo los dos números: el
 * reporte no lleva código fuente.
 *
 * La cuenta sale de la subsecuencia común más larga: lo que no está en ella se
 * añadió o se quitó. Determinista y sin dependencias, como el resto del
 * paquete (ADR 0017 ✓).
 */

export interface LineChanges {
  added: number;
  removed: number;
}

/** Una línea de la vista de diferencias. */
export type DiffLineType = "same" | "add" | "del" | "gap";

export interface DiffRow {
  type: DiffLineType;
  text: string;
  /** Línea en la base, 1-based; `null` si la línea no está ahí. */
  baseLine: number | null;
  /** Línea en el head, 1-based; `null` si la línea no está ahí. */
  headLine: number | null;
}

/** Lo que enseña la vista de diferencias de un fichero. */
export interface FileDiff {
  rows: DiffRow[];
  /**
   * Líneas añadidas en todo el fichero, se pinten o no.
   *
   * `null` cuando el fichero era demasiado grande para alinearlo: contar sin
   * alinear daría el tamaño del fichero, no lo que cambió.
   */
  added: number | null;
  /** Líneas quitadas; `null` si no se midieron. */
  removed: number | null;
  /** `true` cuando el fichero era demasiado grande para diffearlo entero. */
  truncated: boolean;
}

/**
 * El tope de celdas de la tabla `n × m`.
 *
 * Un símbolo normal no llega a 300 líneas; el límite existe para que un
 * fichero entero pegado dentro de una función no se lleve la memoria por
 * delante. Lo que no se mide devuelve `null`, nunca un cero inventado ✓.
 */
const MAX_CELLS = 1_000_000;

/**
 * Las líneas que se añadieron y se quitaron, o `null` si es demasiado grande.
 *
 * Una línea movida cuenta como una quitada más una añadida: es lo que hace un
 * diff, y aquí no hay árbol de sintaxis para adivinarlo.
 */
export function countLineChanges(
  before: readonly string[],
  after: readonly string[]
): LineChanges | null {
  if (before.length === 0) return { added: after.length, removed: 0 };
  if (after.length === 0) return { added: 0, removed: before.length };
  if (before.length * after.length > MAX_CELLS) return null;

  const common = longestCommonSubsequence(before, after);
  return {
    added: after.length - common,
    removed: before.length - common
  };
}

/**
 * Las líneas de un fichero, con las cambiadas y su contexto.
 *
 * Devuelve solo las hunks —tres líneas alrededor de cada cambio— y una fila
 * `gap` entre ellas: es la vista de un diff, no el fichero entero. Las cuentas
 * sí son del fichero entero, se pinten o no.
 */
export function diffLines(
  before: readonly string[],
  after: readonly string[],
  context = 3
): FileDiff {
  const cells = (before.length + 1) * (after.length + 1);
  if (cells > MAX_CELLS) {
    return { rows: [], added: null, removed: null, truncated: true };
  }

  const rows = align(before, after);
  const added = rows.filter((row) => row.type === "add").length;
  const removed = rows.filter((row) => row.type === "del").length;

  // Qué filas se quedan: los cambios y las de al lado. Lo demás es relleno.
  const keep = new Set<number>();
  rows.forEach((row, index) => {
    if (row.type === "same") return;
    const first = Math.max(0, index - context);
    const last = Math.min(rows.length - 1, index + context);
    for (let cursor = first; cursor <= last; cursor++) keep.add(cursor);
  });

  const shown: DiffRow[] = [];
  let previous = -1;
  rows.forEach((row, index) => {
    if (!keep.has(index)) return;
    if (index > previous + 1) {
      shown.push({ type: "gap", text: "", baseLine: null, headLine: null });
    }
    shown.push(row);
    previous = index;
  });
  // Lo que se quedó al final también se anuncia: un hueco arriba y ninguno
  // abajo diría que el fichero acaba donde acaba el contexto.
  if (shown.length > 0 && previous < rows.length - 1) {
    shown.push({ type: "gap", text: "", baseLine: null, headLine: null });
  }

  return { rows: shown, added, removed, truncated: false };
}

/**
 * Empareja las dos listas de líneas y devuelve la secuencia completa.
 *
 * La tabla de la subsecuencia común se recorre hacia atrás desde el final; en
 * caso de empate gana la baja, que es lo que hace git: la línea vieja sale
 * antes que la nueva.
 */
function align(before: readonly string[], after: readonly string[]): DiffRow[] {
  const rows = before.length;
  const columns = after.length;
  const width = columns + 1;
  const table = new Uint32Array((rows + 1) * width);

  for (let row = rows - 1; row >= 0; row--) {
    for (let column = columns - 1; column >= 0; column--) {
      const same = (before[row] ?? "") === (after[column] ?? "");
      table[row * width + column] = same
        ? (table[(row + 1) * width + column + 1] ?? 0) + 1
        : Math.max(
            table[(row + 1) * width + column] ?? 0,
            table[row * width + column + 1] ?? 0
          );
    }
  }

  const aligned: DiffRow[] = [];
  let row = 0;
  let column = 0;
  while (row < rows && column < columns) {
    if ((before[row] ?? "") === (after[column] ?? "")) {
      aligned.push({
        type: "same",
        text: before[row] ?? "",
        baseLine: row + 1,
        headLine: column + 1
      });
      row++;
      column++;
      continue;
    }

    const down = table[(row + 1) * width + column] ?? 0;
    const right = table[row * width + column + 1] ?? 0;
    if (down >= right) {
      aligned.push({ type: "del", text: before[row] ?? "", baseLine: row + 1, headLine: null });
      row++;
    } else {
      aligned.push({ type: "add", text: after[column] ?? "", baseLine: null, headLine: column + 1 });
      column++;
    }
  }

  while (row < rows) {
    aligned.push({ type: "del", text: before[row] ?? "", baseLine: row + 1, headLine: null });
    row++;
  }
  while (column < columns) {
    aligned.push({ type: "add", text: after[column] ?? "", baseLine: null, headLine: column + 1 });
    column++;
  }

  return aligned;
}

/**
 * La longitud de la subsecuencia común más larga, por filas.
 *
 * Solo se guardan dos filas de la tabla: la de antes y la de ahora. La memoria
 * es la del lado más corto, no el producto de los dos.
 */
function longestCommonSubsequence(
  before: readonly string[],
  after: readonly string[]
): number {
  const width = after.length + 1;
  let previous = new Uint32Array(width);
  let current = new Uint32Array(width);

  for (let row = 1; row <= before.length; row++) {
    const line = before[row - 1] ?? "";
    for (let column = 1; column < width; column++) {
      const same = line === (after[column - 1] ?? "");
      current[column] = same
        ? (previous[column - 1] ?? 0) + 1
        : Math.max(previous[column] ?? 0, current[column - 1] ?? 0);
    }
    [previous, current] = [current, previous];
    current.fill(0);
  }

  return previous[after.length] ?? 0;
}
