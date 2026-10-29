import type {
  CcMigrationStatus,
  CcSymbol,
  SymbolEvent
} from "@codarch/schema/browser";

/**
 * El label de un bloque.
 *
 * El nombre **no** se calcula a mano ✗: el bloque lleva su nombre dentro ✓ (un
 * `foreignObject` con texto HTML ✓) y el navegador lo envuelve y lo recorta ✓.
 * Así **no puede salirse del bloque** ✓, por diseño ✓, diga lo que diga el
 * nombre ✓.
 *
 * Lo único que se decide aquí es lo que el navegador no puede adivinar ✓: el
 * tamaño de la fuente ✓ (no hay tamaño automático en CSS ✓) y si el bloque es
 * lo bastante alto para escribir en vertical ✓.
 *
 * Y lo que decide si hay nombre es **cuántas letras caben** ✓: en un bloque de
 * veinte píxeles, un nombre envuelto son dos columnas de dos letras ✓, que no
 * se leen ni con el zoom ✓, porque el zoom agranda la celda y su texto por
 * igual ✓ y la proporción no cambia ✓. Antes de eso, no hay nombre ✓.
 */

export interface BlockLabel {
  /** El tamaño de la fuente, en unidades del mapa ✓. */
  size: number;
  /** Si el texto va en vertical ✓ (un bloque alto y estrecho ✓). */
  vertical: boolean;
}

/** El tamaño máximo del label ✓. */
const MAX_SIZE = 11;

/**
 * El tamaño mínimo del label ✓.
 *
 * Por debajo de esto el nombre es una mancha de letras ✓: se dibuja, se ve, y
 * no se lee ✓.
 */
const MIN_SIZE = 6;

/** Las letras que tienen que caber en una línea del nombre ✓. */
const MIN_CHARS = 5;

/** Qué parte del lado corto ocupa la letra ✓. */
const FILL = 0.42;

/** Lo que ocupa una letra, respecto a su tamaño ✓ (para estimar sin medir ✓). */
const CHAR_WIDTH = 0.55;

/**
 * Cómo se lee cada tipo del mapa del resto (ADR 0093).
 *
 * Son cuatro y no se pliegan: `other` es lo que no casa con ninguna regla, y
 * enseñarlo es lo que impide que un formato nuevo desaparezca del mapa. La
 * tabla vive en el render para que la leyenda del PNG diga lo mismo.
 */
export { KIND_LABEL } from "@codarch/render/browser";

/** Cómo se lee cada estado de la lente de migración ✓. */
export const STATUS_LABEL: Record<CcMigrationStatus, string> = {
  js: "JS / TS",
  rust: "Rust",
  bridge: "Puente",
  native: "Nativo"
};

/** El color de cada estado de migración ✓. */
export const STATUS_COLOR: Record<CcMigrationStatus, string> = {
  js: "#2f6fed",
  rust: "#d95d39",
  bridge: "#7b61ff",
  native: "#3f8f7a"
};

/** El color de cada lenguaje en los estratos ✓. */
export const LANGUAGE_COLOR: Record<string, string> = {
  ts: "#2f6fed",
  js: "#d9a21b",
  rust: "#d95d39",
  wasm: "#7b61ff",
  node: "#3f8f7a"
};

/** Cómo se lee cada evento de la vida de un símbolo ✓. */
export const EVENT_LABEL: Record<SymbolEvent["type"], string> = {
  created: "nació",
  changed: "cambió",
  unchanged: "igual",
  renamed: "renombrada",
  moved: "mudada",
  removed: "eliminada"
};

/** Cómo se lee cada tipo de símbolo en el inspector ✓. */
export const SYMBOL_LABEL: Record<CcSymbol["kind"], string> = {
  function: "fn",
  class: "cls",
  interface: "int",
  type: "typ",
  enum: "enum",
  variable: "var"
};

/** La métrica del calor: cuántas veces se ha tocado el fichero ✓. */
export const CHURN_METRIC = "number_of_commits";

/**
 * El label de un bloque, o `null` si el bloque es demasiado pequeño ✓.
 */
export function labelFor(width: number, height: number): BlockLabel | null {
  const menor = Math.min(width, height);
  // El tamaño sale del lado corto ✓: en un bloque bajo, un texto grande se
  // saldría de alto ✓.
  const size = Math.min(MAX_SIZE, menor * FILL);
  // Si el bloque no da ni para una línea del tamaño mínimo ✓, no hay nombre ✓.
  if (size < MIN_SIZE) return null;
  // Vertical cuando el bloque es claramente más alto que ancho ✓.
  const vertical = height > width * 1.4;
  // Y la línea tiene que llevar un nombre ✓, no dos letras ✓.
  const across = vertical ? height : width;
  if (across < size * CHAR_WIDTH * MIN_CHARS) return null;
  return { size: Math.round(size * 10) / 10, vertical };
}
