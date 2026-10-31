/**
 * Lo que comparten las comparaciones: un orden estable y la lectura de números.
 *
 * El reporte es determinista por estos dos detalles y por ninguno más: se
 * compara por bytes —no por `localeCompare`, que depende del idioma— y un valor
 * que no es finito no es un valor.
 */

export function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function compareByPath(
  left: { path: string; id: string },
  right: { path: string; id: string }
): number {
  return compareStrings(left.path, right.path) || compareStrings(left.id, right.id);
}

export function finiteNumber(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Las métricas de un fichero, con las claves ordenadas y sin las no finitas. */
export function sortedMetrics(
  values: Record<string, number> | undefined
): Record<string, number> {
  const sorted: Record<string, number> = {};
  if (!values) return sorted;
  for (const key of Object.keys(values).sort(compareStrings)) {
    const value = finiteNumber(values[key]);
    if (value !== null) sorted[key] = value;
  }
  return sorted;
}
