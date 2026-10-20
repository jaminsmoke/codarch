/**
 * Navegación espacial entre celdas del treemap.
 *
 * El mapa se dibuja con el layout squarified: las celdas se reparten en franjas.
 * Mover con las flechas debe parecerse a lo que el ojo espera, así que se
 * prefiere la celda más cercana en esa dirección que además comparta banda con
 * la celda actual.
 */

export interface CellBox {
  /** Índice del fichero en el modelo de render. */
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Direction = "left" | "right" | "up" | "down";

interface Range {
  min: number;
  max: number;
}

function range(box: CellBox, axis: "x" | "y"): Range {
  return axis === "x"
    ? { min: box.x, max: box.x + box.w }
    : { min: box.y, max: box.y + box.h };
}

/**
 * Cuánto se sale una celda de la banda de la celda actual.
 *
 * 0 si la celda candidata cabe dentro de la misma franja, y crece según la
 * parte que se sale. Es lo que hace que la flecha derecha siga la fila y no
 * salte a la celda de debajo.
 */
function lateralPenalty(origin: Range, cell: Range): number {
  const overlap = Math.min(origin.max, cell.max) - Math.max(origin.min, cell.min);
  const size = origin.max - origin.min;
  return size - Math.max(0, overlap);
}

/**
 * Devuelve el índice de la celda a la que se movería el foco.
 *
 * `current` es el índice de la celda seleccionada; si es `null`, se devuelve la
 * primera celda para que las flechas siempre tengan destino.
 */
export function nextCell(
  cells: readonly CellBox[],
  current: number | null,
  direction: Direction
): number | null {
  if (cells.length === 0) return null;
  if (current === null) return cells[0]?.index ?? null;

  const origin = cells.find((cell) => cell.index === current);
  if (!origin) return cells[0]?.index ?? null;

  const horizontal = direction === "left" || direction === "right";
  const along = horizontal ? "x" : "y";
  const across = horizontal ? "y" : "x";
  const forward = direction === "right" || direction === "down";

  const originAlong = range(origin, along);
  const originAcross = range(origin, across);

  let best: CellBox | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const cell of cells) {
    if (cell.index === current) continue;
    const cellAlong = range(cell, along);
    const cellAcross = range(cell, across);

    // Solo candidatas las que están en la dirección pedida. Las celdas
    // adyacentes (separación 0) cuentan: en un treemap se tocan.
    const distance = forward
      ? cellAlong.min - originAlong.max
      : originAlong.min - cellAlong.max;
    if (distance < 0) continue;

    // Se penaliza salirse de la banda: mejor seguir en la misma franja.
    const lateral = lateralPenalty(originAcross, cellAcross);
    const score = distance + lateral * 2 + (cell.w * cell.h) / 1e9;
    if (score < bestScore) {
      bestScore = score;
      best = cell;
    }
  }

  return best ? best.index : current;
}
