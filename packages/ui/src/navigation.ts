/**
 * Navegación espacial entre celdas del treemap.
 *
 * El mapa se dibuja con el layout squarified: las celdas se reparten en franjas.
 * Mover con las flechas debe parecerse a lo que el ojo espera, así que se
 * prefiere la celda más cercana en esa dirección que además comparta banda con
 * la celda actual.
 */

import type { PlacedNode } from "@codarch/render/browser";

export interface CellBox {
  /** Identidad estable del elemento: `f:12` para ficheros, `d:src/app` para carpetas. */
  key: string;
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

/** Hacia dónde se mueve: el eje del avance, el de la banda y el sentido. */
interface Axes {
  along: "x" | "y";
  across: "x" | "y";
  forward: boolean;
}

function axesOf(direction: Direction): Axes {
  const horizontal = direction === "left" || direction === "right";
  return {
    along: horizontal ? "x" : "y",
    across: horizontal ? "y" : "x",
    forward: direction === "right" || direction === "down"
  };
}

/**
 * Devuelve la clave de la celda a la que se movería el foco.
 *
 * `current` es la clave de la celda activa; si es `null`, se devuelve la
 * primera celda para que las flechas siempre tengan destino.
 */
export function nextCell(
  cells: readonly CellBox[],
  current: string | null,
  direction: Direction
): string | null {
  if (cells.length === 0) return null;

  const origin =
    current === null ? undefined : cells.find((cell) => cell.key === current);
  if (!origin) return cells[0]?.key ?? null;

  const best = closest(cells, origin, axesOf(direction));
  return best ? best.key : current;
}

/** La celda que queda más cerca en la dirección pedida, o `null` si no hay. */
function closest(
  cells: readonly CellBox[],
  origin: CellBox,
  axes: Axes
): CellBox | null {
  const originAlong = range(origin, axes.along);
  const originAcross = range(origin, axes.across);

  let best: CellBox | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const cell of cells) {
    if (cell.key === origin.key) continue;

    const distance = distanceTo(cell, originAlong, axes);
    if (distance === null) continue;

    // Se penaliza salirse de la banda: mejor seguir en la misma franja.
    const lateral = lateralPenalty(originAcross, range(cell, axes.across));
    const score = distance + lateral * 2 + (cell.w * cell.h) / 1e9;
    if (score < bestScore) {
      bestScore = score;
      best = cell;
    }
  }

  return best;
}

/**
 * Cuánto hay que avanzar para llegar a la celda, o `null` si no está delante.
 *
 * Las celdas adyacentes (separación 0) cuentan: en un treemap se tocan.
 */
function distanceTo(
  cell: CellBox,
  originAlong: Range,
  axes: Axes
): number | null {
  const cellAlong = range(cell, axes.along);
  const distance = axes.forward
    ? cellAlong.min - originAlong.max
    : originAlong.min - cellAlong.max;
  return distance < 0 ? null : distance;
}

/** Qué hay detrás de una celda navegable. */
export interface CellTarget {
  kind: "file" | "folder";
  fileIndex?: number;
  path?: string;
}

/** Las celdas que se pueden recorrer, con lo que hay en cada una. */
export interface NavigableCells {
  targets: CellBox[];
  targetMeta: Map<string, CellTarget>;
}

/**
 * Las celdas navegables del mapa: ficheros y carpetas sin contenido dibujado.
 *
 * Una carpeta con hijos es un contenedor, no una celda: ocupa el área de sus
 * hijos y no se puede «entrar» moviéndose a un lado. Las carpetas hoja sí: en
 * un repositorio grande el mapa se dibuja a nivel de carpeta.
 */
export function navigableCells(
  placed: readonly PlacedNode[]
): NavigableCells {
  const targets: CellBox[] = [];
  const targetMeta = new Map<string, CellTarget>();

  const walk = (nodes: readonly PlacedNode[]): void => {
    for (const placedNode of nodes) {
      const { node, rect } = placedNode;
      if (node.kind === "file") {
        if (node.fileIndex === undefined) continue;
        const key = `f:${node.fileIndex}`;
        targets.push({ key, x: rect.x, y: rect.y, w: rect.w, h: rect.h });
        targetMeta.set(key, { kind: "file", fileIndex: node.fileIndex });
        continue;
      }

      const children = placedNode.children ?? [];
      if (children.length === 0) {
        targets.push({ key: node.key, x: rect.x, y: rect.y, w: rect.w, h: rect.h });
        targetMeta.set(node.key, { kind: "folder", path: node.path });
        continue;
      }

      walk(children);
    }
  };

  walk(placed);
  return { targets, targetMeta };
}
