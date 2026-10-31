import type {
  ChangedFile,
  DiffFile,
  Hotspot,
  IndexedSnapshot
} from "./diff-types";
import { compareStrings, finiteNumber } from "./diff-shared";

/**
 * Los hotspots: los ficheros donde la métrica elegida ha subido.
 *
 * Solo cuenta lo que sube, porque un hotspot es una deuda que se añade en este
 * PR. Un fichero nuevo parte de cero, no de lo que midiera otro con el mismo
 * nombre (el emparejamiento es por id).
 */

/** La métrica del top: la pedida, o `maxComplexity` y luego `rloc`. */
export function chooseHotspotMetric(
  base: IndexedSnapshot,
  head: IndexedSnapshot,
  requested: string | undefined
): string | null {
  if (requested) return requested;
  for (const metric of ["maxComplexity", "rloc"]) {
    if (hasMetric(base, metric) || hasMetric(head, metric)) return metric;
  }
  return null;
}

function hasMetric(index: IndexedSnapshot, metric: string): boolean {
  for (const values of Object.values(index.metrics)) {
    if (finiteNumber(values[metric]) !== null) return true;
  }
  return false;
}

export function buildHotspots(
  base: IndexedSnapshot,
  head: IndexedSnapshot,
  added: readonly DiffFile[],
  changed: readonly ChangedFile[],
  metric: string,
  top: number
): Hotspot[] {
  const addedIds = new Set(added.map((file) => file.id));
  const candidates = [...added, ...changed];

  const hotspots: Hotspot[] = [];
  for (const file of candidates) {
    const baseValue = finiteNumber(base.metrics[file.id]?.[metric]);
    const headValue = finiteNumber(head.metrics[file.id]?.[metric]);
    if (headValue === null) continue;

    const before = baseValue ?? 0;
    const delta = headValue - before;
    if (delta <= 0) continue;

    hotspots.push({
      id: file.id,
      path: file.path,
      metric,
      base: before,
      head: headValue,
      delta,
      change: addedIds.has(file.id) ? "added" : "changed"
    });
  }

  return hotspots
    .sort(
      (left, right) =>
        right.delta - left.delta ||
        right.head - left.head ||
        compareStrings(left.path, right.path)
    )
    .slice(0, top);
}
