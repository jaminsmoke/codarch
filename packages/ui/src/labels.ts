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
 */

export interface BlockLabel {
  /** El tamaño de la fuente, en unidades del mapa ✓. */
  size: number;
  /** Si el texto va en vertical ✓ (un bloque alto y estrecho ✓). */
  vertical: boolean;
}

/** El tamaño máximo del label ✓. */
const MAX_SIZE = 11;

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
  // A partir de dos píxeles ya se dibuja ✓: el navegador lo recorta ✓ y con
  // el zoom se lee ✓. Por debajo, no hay nada que enseñar ✓.
  if (menor < 2) return null;

  // El tamaño sale del lado corto ✓: en un bloque bajo, un texto grande se
  // saldría de alto ✓.
  const size = Math.min(MAX_SIZE, Math.max(4, menor * 0.42));
  // Vertical cuando el bloque es claramente más alto que ancho ✓.
  const vertical = height > width * 1.4;
  return { size: Math.round(size * 10) / 10, vertical };
}
