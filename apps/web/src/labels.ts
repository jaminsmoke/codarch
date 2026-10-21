/**
 * Cómo se ajusta el nombre de un bloque al bloque.
 *
 * Un nombre que se sale de su bloque pisa al de al lado ✗ y hace el mapa
 * ilegible ✗. Y un nombre recortado ("analy…") no dice nada ✗.
 *
 * La regla es: **el nombre se muestra entero** ✓ y es el texto el que se
 * encoge ✓. El SVG sabe comprimir un texto hasta un ancho dado ✓
 * (`textLength` ✓), así que el bloque nunca se desborda ✓ y el nombre nunca
 * sale recortado ✓.
 *
 * Y si el bloque es tan pequeño que no cabe ni al mínimo ✓, no se dibuja
 * nada ✓: un borrón sin sentido es peor que un hueco ✓.
 */

/** El ancho medio de un carácter, respecto a su tamaño ✓. */
const CHAR_WIDTH = 0.6;

export interface FittedLabel {
  /** El nombre **entero** ✓: nunca se recorta ✓. */
  text: string;
  /** El tamaño de la fuente ✓. */
  size: number;
  /** Si el texto va girado ✓. */
  rotate: boolean;
  /**
   * El ancho al que hay que comprimir el texto ✓, o `null` si ya cabe ✓.
   *
   * Lo aplica el SVG (`textLength` ✓) ✓: el texto se estrecha en vez de
   * recortarse ✓.
   */
  length: number | null;
}

export interface FitOptions {
  /** El ancho del bloque ✓. */
  width: number;
  /** El alto del bloque ✓. */
  height: number;
  /** El tamaño máximo ✓. */
  maxSize?: number;
  /** El tamaño mínimo ✓ (por debajo, no se dibuja ✓). */
  minSize?: number;
  /** El margen alrededor ✓. */
  padding?: number;
  /**
   * El ancho medio de un carácter ✓.
   *
   * La fuente sin-serif es más estrecha que la monoespaciada ✓, y por eso las
   * carpetas (que van en mono ✓) necesitan un margen extra ✓.
   */
  charWidth?: number;
}

/**
 * El nombre que cabe en el bloque, o `null` si no cabe de ninguna manera ✓.
 */
export function fitLabel(
  name: string,
  options: FitOptions
): FittedLabel | null {
  const maxSize = options.maxSize ?? 11;
  // El mínimo es bajo a propósito ✓: en un bloque pequeño el nombre se
  // encoge hasta ser un borrón ✓, pero con el zoom se lee ✓.
  const minSize = options.minSize ?? 4;
  // El margen es pequeño ✓: en un bloque diminuto, dos píxeles de aire ya
  // son mucho ✓.
  const padding = options.padding ?? 2;
  const charWidth = options.charWidth ?? CHAR_WIDTH;

  const availableWidth = options.width - padding * 2;
  const availableHeight = options.height - padding * 2;
  if (availableWidth < 4 || availableHeight < 3) return null;
  if (name.length === 0) return null;

  // 1. Horizontal: el tamaño lo manda la altura, pero también el ancho ✓
  //    (el nombre entero tiene que caber ✓).
  const byHeight = Math.min(maxSize, availableHeight * 0.68);
  const byWidth = availableWidth / (name.length * charWidth);
  const horizontal = Math.min(byHeight, byWidth);
  if (horizontal >= minSize) {
    return {
      text: name,
      size: round(horizontal),
      rotate: false,
      length: null
    };
  }

  // 2. Vertical: en un bloque alto y estrecho ✓, el texto girado sí cabe ✓.
  const verticalByWidth = Math.min(maxSize, availableWidth * 0.8);
  const verticalByHeight = availableHeight / (name.length * charWidth);
  const vertical = Math.min(verticalByWidth, verticalByHeight);
  if (vertical >= minSize) {
    return {
      text: name,
      size: round(vertical),
      rotate: true,
      length: null
    };
  }

  // 3. Ni horizontal ni vertical cabe del tirón ✓: se dibuja al mínimo y
  //    se deja que el SVG lo estreche ✓ (así al menos se lee el nombre ✓).
  if (byHeight >= minSize) {
    return {
      text: name,
      size: round(minSize),
      rotate: false,
      length: availableWidth
    };
  }
  if (verticalByWidth >= minSize) {
    return {
      text: name,
      size: round(minSize),
      rotate: true,
      length: availableHeight
    };
  }

  // 4. El bloque es tan pequeño que no da para nada ✓.
  return null;
}

/** Redondea hacia abajo ✓: el tamaño nunca se pasa ✓ (y el texto no se sale ✓). */
function round(value: number): number {
  return Math.floor(value * 10) / 10;
}
