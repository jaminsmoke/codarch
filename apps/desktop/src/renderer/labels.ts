/**
 * Cómo se ajusta el nombre de un bloque al bloque.
 *
 * Un nombre que se sale de su bloque pisa al de al lado ✗ y hace el mapa
 * ilegible ✗. Y un nombre en un bloque diminuto tampoco sirve ✗: se achica
 * hasta que se ve con el zoom ✓.
 *
 * Las reglas son tres, y en este orden:
 *
 * 1. **Horizontal**, con el tamaño que cabe en la altura ✓.
 * 2. **Vertical** (girada 90°), si en horizontal no cabe ✓: en un bloque
 *    alto y estrecho ✓ el texto girado sí cabe ✓.
 * 3. **Nada**, si tampoco cabe de ninguna manera ✓.
 */

/** El ancho medio de un carácter, respecto a su tamaño ✓. */
const CHAR_WIDTH = 0.6;

export interface FittedLabel {
  text: string;
  /** El tamaño de la fuente ✓. */
  size: number;
  /** Si el texto va girado ✓. */
  rotate: boolean;
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
  const padding = options.padding ?? 3;
  const charWidth = options.charWidth ?? CHAR_WIDTH;

  const availableWidth = options.width - padding * 2;
  const availableHeight = options.height - padding * 2;
  if (availableWidth < 6 || availableHeight < 5) return null;

  // 1. Horizontal: el tamaño lo manda la altura del bloque ✓.
  const horizontalSize = Math.min(maxSize, availableHeight * 0.68);
  if (horizontalSize >= minSize) {
    const fits = Math.floor(availableWidth / (horizontalSize * charWidth));
    if (fits >= 3) {
      return {
        text: cut(name, fits),
        size: Math.round(horizontalSize * 10) / 10,
        rotate: false
      };
    }
  }

  // 2. Vertical: ahora el ancho disponible es el alto del bloque ✓.
  const verticalSize = Math.min(maxSize, availableWidth * 0.8);
  if (verticalSize >= minSize) {
    const fits = Math.floor(availableHeight / (verticalSize * charWidth));
    if (fits >= 3) {
      return {
        text: cut(name, fits),
        size: Math.round(verticalSize * 10) / 10,
        rotate: true
      };
    }
  }

  // 3. Ni horizontal ni vertical: no se dibuja ✓.
  return null;
}

/**
 * Recorta el nombre para que quepa ✓.
 *
 * Si quitando la extensión cabe ✓, se quita ✓: "App" se entiende ✓ y
 * "App.tsx" no cabe ✓.
 */
export function cut(name: string, fits: number): string {
  if (name.length <= fits) return name;
  const withoutExtension = name.replace(/\.[^.]+$/, "");
  if (withoutExtension.length <= fits) return withoutExtension;
  if (fits <= 1) return name.slice(0, Math.max(1, fits));
  return `${name.slice(0, fits - 1)}…`;
}
