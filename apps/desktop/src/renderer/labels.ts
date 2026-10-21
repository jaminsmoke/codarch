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
