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
 * Y si el bloque es diminuto (una astilla de dos píxeles ✓), el nombre se
 * dibuja igual ✓: con el zoom se lee ✓ (el zoom agranda el bloque y su
 * nombre a la vez ✓).
 */

/**
 * El ancho medio de un carácter, respecto a su tamaño ✓.
 *
 * Va un poco sobrado ✓: la fuente real varía por carácter ✓ y conviene
 * quedarse corto antes que dejar un nombre colgando fuera del bloque ✓.
 */
const CHAR_WIDTH = 0.66;

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
   * Lo aplica el SVG (`textLength` ✓): el texto se estrecha en vez de
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
  /** El tamaño mínimo para que el texto se lea de verdad ✓. */
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
 * El nombre que cabe en el bloque, o `null` si el bloque no da para nada ✓.
 */
export function fitLabel(
  name: string,
  options: FitOptions
): FittedLabel | null {
  const maxSize = options.maxSize ?? 11;
  // El mínimo es bajísimo a propósito ✓: en una astilla de dos píxeles, un
  // texto de 1,8 px cabe girado ✓ (y con el zoom se lee ✓ ✓). Recortarlo o
  // esconderlo sería mentir sobre lo que hay ✓.
  const charWidth = options.charWidth ?? CHAR_WIDTH;

  // El margen es pequeño ✓ y nunca mayor que la cuarta parte del bloque ✓:
  // en una astilla de dos píxeles, dos de margen se comerían el bloque entero ✓.
  const margin = Math.min(
    options.padding ?? 2,
    Math.floor(Math.min(options.width, options.height) / 4)
  );
  const availableWidth = options.width - margin * 2;
  const availableHeight = options.height - margin * 2;
  if (availableWidth < 1 || availableHeight < 1) return null;
  if (name.length === 0) return null;

  // 1. Las dos orientaciones, y gana la que se lee mejor ✓ (la fuente más
  //    grande ✓). En un bloque alto y estrecho, el texto girado se lee mucho
  //    mejor que el horizontal aplastado ✓.
  const horizontal = tryFit(
    name,
    availableWidth,
    availableHeight,
    maxSize,
    charWidth
  );
  const vertical = tryFit(
    name,
    availableHeight,
    availableWidth,
    maxSize,
    charWidth
  );

  const horizontalSize = horizontal?.size ?? 0;
  const verticalSize = vertical?.size ?? 0;

  if (vertical && verticalSize > horizontalSize) {
    return { ...vertical, rotate: true };
  }
  if (horizontal) {
    return { ...horizontal, rotate: false };
  }

  // 2. Ninguna de las dos llega al mínimo ✓: se dibuja al mínimo y se deja
  //    que el SVG lo estreche ✓. El nombre sigue being there ✓.
  //
  //    Ojo: `textLength` es **exacto** ✓, el navegador estira el texto hasta
  //    ese largo ✓. Por eso solo se usa cuando el texto es más largo de lo que
  //    cabe ✓: si no, el nombre se estiraría por todo el bloque ✗.
  const rotate = availableHeight > availableWidth;
  const across = rotate ? availableWidth : availableHeight;
  const along = rotate ? availableHeight : availableWidth;
  const squeezed = Math.min(maxSize, across * 0.9);
  if (squeezed < 1) return null;
  return {
    text: name,
    size: round(squeezed),
    rotate,
    length: lengthFor(name, squeezed, along, charWidth)
  };
}

/**
 * El largo al que hay que forzar el texto ✓, o `null` si ya cabe ✓.
 *
 * `textLength` es exacto ✓: el navegador estira o comprime hasta ese largo ✓.
 * Por eso solo se aplica cuando el texto natural es más largo ✓.
 */
function lengthFor(
  name: string,
  size: number,
  available: number,
  charWidth: number
): number | null {
  const natural = name.length * size * charWidth;
  return natural > available ? Math.max(1, available) : null;
}

/**
 * Cómo queda el nombre en un eje ✓.
 *
 * `along` es el espacio para el largo del texto ✓ y `across` el espacio para
 * la altura de la fuente ✓.
 */
function tryFit(
  name: string,
  along: number,
  across: number,
  maxSize: number,
  charWidth: number
): FittedLabel | null {
  if (along < 1 || across < 1) return null;
  const size = Math.min(
    maxSize,
    across * 0.9,
    along / (name.length * charWidth)
  );
  if (size < 1) return null;
  return {
    text: name,
    size: round(size),
    rotate: false,
    length: lengthFor(name, size, along, charWidth)
  };
}

/** Redondea hacia abajo ✓: el tamaño nunca se pasa ✓ (y el texto no se sale ✓). */
function round(value: number): number {
  return Math.floor(value * 10) / 10;
}
