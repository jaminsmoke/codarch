import type { IndexedSnapshot, MetricTotal, ReportTotals } from "./diff-types";
import { compareStrings, finiteNumber } from "./diff-shared";

/**
 * Las métricas que ya son un máximo por fichero.
 *
 * Sumarlas diría una cifra que no existe: la complejidad de un cambio no es la
 * suma de las complejidades de sus ficheros. Se agregan como máximo; el resto,
 * como suma. Es la misma lista que usan las hojas de carpeta y proyecto, y vive
 * aquí para que el reporte y la UI no tengan dos.
 */
export const MAX_METRICS = new Set([
  "maxComplexity",
  "max_complexity_per_function",
  "maxFunctionLength",
  "dependencyLevel",
  "inCycle",
  "cycleSize"
]);

/**
 * Los totales de cada métrica en los dos lados del cambio (ADR 0071).
 *
 * Una métrica que un lado no declara sale `null`, no cero: no es lo mismo no
 * tenerla que valer cero, y el delta tampoco se inventa. Las claves van
 * ordenadas para que el reporte sea determinista.
 */
export function buildTotals(
  base: IndexedSnapshot,
  head: IndexedSnapshot
): ReportTotals {
  const baseTotals = totalsOf(base);
  const headTotals = totalsOf(head);
  const keys = [
    ...new Set([...Object.keys(baseTotals), ...Object.keys(headTotals)])
  ].sort(compareStrings);

  const metrics: Record<string, MetricTotal> = {};
  for (const key of keys) {
    const baseValue = baseTotals[key] ?? null;
    const headValue = headTotals[key] ?? null;
    metrics[key] = {
      base: baseValue,
      head: headValue,
      delta:
        baseValue !== null && headValue !== null ? headValue - baseValue : null
    };
  }
  return { metrics };
}

/** Un lado: suma de las métricas aditivas y máximo de las que ya son máximo. */
function totalsOf(index: IndexedSnapshot): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const attributes of Object.values(index.metrics)) {
    for (const [key, raw] of Object.entries(attributes)) {
      const value = finiteNumber(raw);
      if (value === null) continue;
      if (MAX_METRICS.has(key)) {
        totals[key] =
          totals[key] === undefined ? value : Math.max(totals[key], value);
      } else {
        totals[key] = (totals[key] ?? 0) + value;
      }
    }
  }
  return totals;
}
