export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutItem {
  /** Identificador estable. El layout no lo interpreta. */
  key: string;
  /** Peso relativo. Debe ser > 0. */
  value: number;
}

export interface PlacedItem<T extends LayoutItem> extends Rect {
  item: T;
}

/**
 * Treemap "squarified" (Bruls, Huizing, van Wijk).
 *
 * Determinista: ordena por valor descendente y desempata por el orden de entrada.
 * Ignora elementos con valor no finito o <= 0: no tienen área que repartir.
 * No modifica la lista original.
 */
export function squarify<T extends LayoutItem>(
  items: readonly T[],
  rect: Rect
): Array<PlacedItem<T>> {
  if (rect.w <= 0 || rect.h <= 0) return [];

  const usable = items.filter(
    (item) => Number.isFinite(item.value) && item.value > 0
  );
  const total = usable.reduce((sum, item) => sum + item.value, 0);
  if (usable.length === 0 || total <= 0) return [];

  const sorted = usable
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.value - a.item.value || a.index - b.index)
    .map(({ item }) => item);
  const scale = (rect.w * rect.h) / total;
  const placed: Array<PlacedItem<T>> = [];

  let x = rect.x;
  let y = rect.y;
  let w = rect.w;
  let h = rect.h;
  let row: T[] = [];

  const area = (item: T): number => item.value * scale;

  function worst(candidate: readonly T[], side: number): number {
    let sum = 0;
    let max = -Infinity;
    let min = Infinity;

    for (const item of candidate) {
      const value = area(item);
      sum += value;
      if (value > max) max = value;
      if (value < min) min = value;
    }

    if (sum <= 0 || side <= 0) return Infinity;
    return Math.max(
      (side * side * max) / (sum * sum),
      (sum * sum) / (side * side * min)
    );
  }

  function place(current: readonly T[], horizontal: boolean): void {
    if (current.length === 0) return;

    const sum = current.reduce((acc, item) => acc + area(item), 0);
    if (sum <= 0) return;

    if (horizontal) {
      if (w <= 0) return;
      const thickness = sum / w;
      if (!Number.isFinite(thickness) || thickness <= 0) return;
      let position = x;
      for (const item of current) {
        const length = area(item) / thickness;
        placed.push({ item, x: position, y, w: length, h: thickness });
        position += length;
      }
      y += thickness;
      h -= thickness;
    } else {
      if (h <= 0) return;
      const thickness = sum / h;
      if (!Number.isFinite(thickness) || thickness <= 0) return;
      let position = y;
      for (const item of current) {
        const length = area(item) / thickness;
        placed.push({ item, x, y: position, w: thickness, h: length });
        position += length;
      }
      x += thickness;
      w -= thickness;
    }
  }

  let index = 0;
  while (index < sorted.length) {
    const horizontal = w >= h;
    const side = horizontal ? w : h;
    const next = sorted[index] as T;

    if (row.length === 0) {
      row.push(next);
      index++;
      continue;
    }

    if (worst([...row, next], side) <= worst(row, side)) {
      row.push(next);
      index++;
    } else {
      place(row, horizontal);
      row = [];
    }
  }

  if (row.length > 0) place(row, w >= h);

  return placed;
}
