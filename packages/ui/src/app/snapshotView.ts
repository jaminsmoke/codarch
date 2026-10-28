import type { CcJson, CcStats } from "@codarch/schema/browser";
import { defaultMetric } from "@codarch/schema/browser";
import type { ViewPreferences } from "../storage";

/**
 * Qué se pinta con un snapshot que se abre.
 *
 * `areaMetric` decide el tamaño de las celdas y `colorMode` su color. Las dos
 * tienen que existir en el snapshot: una preferencia de otro proyecto no vale
 * aquí, y una métrica de color que no está se cambia por el riesgo en vez de
 * dejar el mapa sin pintar.
 */
export interface SnapshotView {
  areaMetric: string | null;
  colorMode: string;
}

/** Las métricas que este snapshot trae, para no elegir una que no está. */
export function metricCoverage(stats: CcStats): Set<string> {
  return new Set(stats.metricCoverage.map((entry) => entry.name));
}

/**
 * El área y el color con los que abre un snapshot recién cargado.
 *
 * El área es la de las preferencias si existe, y si no `rloc` o la que más
 * ficheros cubra. El color es el de las preferencias si existe, y si no la
 * deuda de migración cuando el snapshot la trae —es lo que se viene a ver de
 * un repositorio nuevo— y el riesgo cuando no.
 */
export function planSnapshotView(
  parsed: CcJson,
  stats: CcStats,
  preferences: ViewPreferences | null | undefined
): SnapshotView {
  const coverage = metricCoverage(stats);

  const fallbackArea = coverage.has("rloc")
    ? "rloc"
    : defaultMetric(stats) ?? stats.metricCoverage[0]?.name ?? null;

  const preferredColor = preferences?.colorMode;
  const validColor =
    preferredColor &&
    (preferredColor === "risk" ||
      preferredColor === "structure" ||
      (preferredColor === "status" && Boolean(parsed.lenses?.migration)) ||
      coverage.has(preferredColor))
      ? preferredColor
      : null;

  const defaultColor =
    parsed.lenses?.migration && coverage.has("migrationDebt")
      ? "migrationDebt"
      : "risk";

  return {
    areaMetric:
      preferences?.areaMetric && coverage.has(preferences.areaMetric)
        ? preferences.areaMetric
        : fallbackArea,
    colorMode: validColor ?? defaultColor
  };
}

/**
 * El área de un refresco: se queda la que se está mirando si sigue existiendo.
 *
 * Un refresco es el mismo proyecto con datos nuevos, así que mover el mapa para
 * quien lo está leyendo sería peor que enseñar un área peor.
 */
export function keepArea(
  current: string | null,
  coverage: ReadonlySet<string>,
  planned: string | null
): string | null {
  if (current && coverage.has(current)) return current;
  return planned;
}

/**
 * El color de un refresco: se queda el que se está mirando.
 *
 * Los tres modos que no son una métrica —riesgo, estructura y estado de
 * migración— no dependen del snapshot y siempre se pueden conservar. Una
 * métrica que ha desaparecido cae al riesgo.
 */
export function keepColor(
  current: string,
  coverage: ReadonlySet<string>
): string {
  if (current === "risk" || current === "structure" || current === "status") {
    return current;
  }
  return coverage.has(current) ? current : "risk";
}
