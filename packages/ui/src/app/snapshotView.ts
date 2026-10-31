import type { CcJson, CcMigrationLens, CcStats } from "@codarch/schema/browser";
import { defaultMetric, getStats } from "@codarch/schema/browser";
import type { ViewPreferences } from "../storage";
import { isColorModeAvailable } from "../viewState";
import { readMigration } from "../data";

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
  return {
    areaMetric: planArea(preferences?.areaMetric, coverage, stats),
    colorMode:
      planColor(preferences?.colorMode, coverage, parsed) ??
      defaultColor(parsed, coverage)
  };
}

/** El área: la preferida si este snapshot la trae, y la de siempre si no. */
function planArea(
  preferred: string | null | undefined,
  coverage: ReadonlySet<string>,
  stats: CcStats
): string | null {
  if (preferred && coverage.has(preferred)) return preferred;
  if (coverage.has("rloc")) return "rloc";
  return defaultMetric(stats) ?? stats.metricCoverage[0]?.name ?? null;
}

/**
 * El color preferido, o `null` si con este snapshot no se puede pintar.
 *
 * La regla de qué se puede pintar es la misma que la de un enlace compartido
 * (`isColorModeAvailable`): una preferencia de otro proyecto no abre aquí.
 */
function planColor(
  preferred: string | null | undefined,
  coverage: ReadonlySet<string>,
  parsed: CcJson
): string | null {
  if (!preferred) return null;
  return isColorModeAvailable(preferred, coverage, readMigration(parsed))
    ? preferred
    : null;
}

/** Sin preferencia: la deuda de migración si la trae, y el riesgo si no. */
function defaultColor(parsed: CcJson, coverage: ReadonlySet<string>): string {
  return parsed.lenses?.migration && coverage.has("migrationDebt")
    ? "migrationDebt"
    : "risk";
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
 * El color de un refresco: se queda el que se está mirando, si se puede pintar.
 *
 * Riesgo y estructura no dependen del snapshot y siempre se conservan. El estado
 * de migración sí depende: sin lente, `mapColorFor` pintaría todos los ficheros
 * como `js` —un mapa de un solo color, sin leyenda—, así que cae al riesgo igual
 * que una métrica que ha desaparecido. La regla es la misma que la de un enlace
 * compartido: `isColorModeAvailable`.
 */
export function keepColor(
  current: string,
  coverage: ReadonlySet<string>,
  migration: CcMigrationLens | null
): string {
  return isColorModeAvailable(current, coverage, migration) ? current : "risk";
}

/** Lo que un cambio de mapa puede hacer (ADR 0093). */
export type MapSwitch =
  /** Ya se está en ese mapa: no hay nada que hacer. */
  | { kind: "same" }
  /** No hay mapa del resto que abrir: no se puede ir. */
  | { kind: "blocked" }
  /** Se cambia de mapa, con el área y el color de ese mapa. */
  | {
      kind: "switch";
      map: "code" | "rest";
      areaMetric: string | null;
      colorMode: string;
    };

/**
 * Qué área y qué color toca al cambiar de mapa.
 *
 * Es un cambio de modelo, no de vista: el resto se mide en bytes y se pinta por
 * tipo, y al volver al código se recuperan el área y el color que pedían las
 * preferencias de este repo. Sin resto cargado, a `rest` no se puede ir, y sin
 * snapshot del código no hay preferencia que recuperar.
 */
export function planMapSwitch(input: {
  next: "code" | "rest";
  current: "code" | "rest";
  cc: CcJson | null;
  rest: CcJson | null;
  preferences: ViewPreferences | null | undefined;
}): MapSwitch {
  if (input.next === input.current) return { kind: "same" };
  if (input.next === "rest") {
    if (!input.rest) return { kind: "blocked" };
    return { kind: "switch", map: "rest", areaMetric: "bytes", colorMode: "kind" };
  }
  const plan = input.cc
    ? planSnapshotView(input.cc, getStats(input.cc), input.preferences)
    : null;
  return {
    kind: "switch",
    map: "code",
    areaMetric: plan?.areaMetric ?? null,
    colorMode: plan?.colorMode ?? "risk"
  };
}
