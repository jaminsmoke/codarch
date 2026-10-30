import type { RenderFile, RenderMetric, RenderModel } from "@codarch/render/browser";
import { formatCompact } from "@codarch/render/browser";

/** Las métricas que se enseñan primero, en este orden ✓. */
const PREFERRED_METRICS = [
  "rloc",
  "loc",
  "migrationDebt",
  "ffiCrossings",
  "maxComplexity",
  "maxFunctionLength",
  "functions",
  "fanIn",
  "fanOut",
  "number_of_commits",
  "number_of_authors"
];

/** Ordena las métricas del snapshot: primero las preferidas ✓. */
export function orderedMetrics(names: Iterable<string>): string[] {
  const coverage = new Set(names);
  const preferred = PREFERRED_METRICS.filter((key) => coverage.has(key));
  const rest = [...coverage]
    .filter((key) => !preferred.includes(key))
    .sort((left, right) => left.localeCompare(right));
  return [...preferred, ...rest];
}

/**
 * El orden fijo de la ficha del fichero (ADR 0060).
 *
 * Primero lo que identifica al fichero, después cómo se ha tocado, cómo se
 * conecta, lo que costaría migrarlo y, al final, los imports. El orden no
 * cambia entre ficheros: la posición de una fila es su sitio, y así se compara
 * de un vistazo. Lo que no esté en la lista se queda detrás, en el orden del
 * modelo.
 */
const ROW_ORDER = [
  "rloc",
  "loc",
  "maxComplexity",
  "max_complexity_per_function",
  "complexity",
  "maxFunctionLength",
  "functions",
  "number_of_functions",
  "number_of_commits",
  "number_of_authors",
  "fanIn",
  "fanOut",
  "inCycle",
  "cycleSize",
  "dependencyLevel",
  "migrationDebt",
  "ffiCrossings",
  "imports",
  "externalImports",
  "builtinImports",
  "typeOnlyImports",
  "unresolvedImports"
];

/**
 * El estado de una métrica, para el color de la tabla.
 *
 * Solo se pinta lo que tiene dirección `-1` (menos es mejor): en el resto, un
 * valor alto no es ni bueno ni malo y el color mentiría. Los umbrales son
 * deliberadamente conservadores —el p95 ya es el 5 % más alto del proyecto—:
 * hasta el 75 % del p95, neutro; del 75 % al p95, ocre; en el p95 o por encima,
 * deuda. Si el p95 es 0, cualquier valor positivo es una excepción y se pinta
 * como deuda.
 */
export type MetricState = "ok" | "watch" | "debt" | "none";

const WATCH_RATIO = 0.75;

export function metricState(
  value: number | null,
  metric: Pick<RenderMetric, "direction" | "p95">
): MetricState {
  if (value === null || !Number.isFinite(value)) return "none";
  if (metric.direction >= 0) return "none";
  if (metric.p95 <= 0) return value > 0 ? "debt" : "ok";
  const ratio = value / metric.p95;
  if (ratio >= 1) return "debt";
  if (ratio >= WATCH_RATIO) return "watch";
  return "ok";
}

/**
 * La parte de la barra que se rellena, de 0 a 1.
 *
 * Se compara con el p95, no con el máximo: un solo fichero enorme no debe
 * aplastar el resto. En las métricas logarítmicas se usa la misma escala que el
 * mapa, para que la barra y el color cuenten lo mismo. Si el p95 es 0, se toma
 * el máximo real como referencia; si tampoco hay, la barra se queda vacía.
 */
export function metricShare(
  value: number | null,
  metric: Pick<RenderMetric, "mode" | "p95" | "actualMax">
): number {
  if (value === null || !Number.isFinite(value)) return 0;
  const reference = metric.p95 > 0 ? metric.p95 : metric.actualMax;
  if (reference <= 0) return 0;
  const magnitude = Math.max(0, value);
  const ratio =
    metric.mode === "log"
      ? Math.log1p(magnitude) / Math.max(1e-9, Math.log1p(reference))
      : magnitude / reference;
  return Math.max(0, Math.min(1, ratio));
}

/** El riesgo también tiene su semáforo: 40 y 70 sobre 100 (ADR 0060). */
export function riskState(risk: number): MetricState {
  if (risk >= 0.7) return "debt";
  if (risk >= 0.4) return "watch";
  return "ok";
}

/**
 * La suma de una métrica en un conjunto de ficheros.
 *
 * Es lo que la ficha de proyecto y la de carpeta cuentan de su subárbol: los
 * totales son una suma, no un p95, y se dice cuando el snapshot no trae la
 * métrica (`null`) en vez de fingir un cero. Los ficheros sin valor no suman.
 */
export function sumMetric(
  model: RenderModel,
  files: readonly RenderFile[],
  key: string
): number | null {
  const index = model.metrics.findIndex((metric) => metric.key === key);
  if (index < 0) return null;
  let total = 0;
  let seen = false;
  for (const file of files) {
    const value = file.values[index];
    if (value === null || value === undefined) continue;
    total += value;
    seen = true;
  }
  return seen ? total : null;
}

/** Una fila de la tabla de métricas del inspector. */
export interface FileMetricRow {
  key: string;
  title: string;
  /** `null` cuando el snapshot no trae esa métrica para este fichero. */
  value: number | null;
  /** La barra, de 0 a 1. */
  share: number;
  state: MetricState;
  /** La métrica que decide el área del mapa. */
  area: boolean;
  /** El riesgo es derivado, no una métrica del snapshot. */
  risk: boolean;
  /** Explicación breve de qué mide, para el icono de ayuda. */
  description: string;
  /** Lo que cuenta el tooltip: la escala y la cobertura. */
  hint: string;
}

/**
 * Las filas de la ficha del fichero (ADR 0060).
 *
 * El riesgo va primero porque es la lectura del mapa. Después, cada métrica del
 * modelo una sola vez: la tabla sustituye a la rejilla y al listado, que
 * repetían área, complejidad, churn, deuda y cruces. El área ya no es una fila:
 * es una marca en la métrica que la decide.
 */
export function fileMetricRows(
  model: RenderModel | null,
  file: RenderFile,
  areaMetric: string | null,
  metricTitle: (key: string) => string
): FileMetricRow[] {
  const places = file.riskParts;
  const risk: FileMetricRow = {
    key: "risk",
    title: "Riesgo",
    value: Math.round(file.risk * 100),
    share: Math.max(0, Math.min(1, file.risk)),
    state: riskState(file.risk),
    area: false,
    risk: true,
    description:
      "Combinación de complejidad, churn, tamaño y lint —cuando se mide—, normalizada por el p95 del proyecto.",
    hint:
      `${Math.round(file.risk * 100)} de 100 · ` +
      `complejidad ${formatCompact(places.complexity.value)} (p95 ${formatCompact(places.complexity.p95)}) · ` +
      `churn ${formatCompact(places.churn.value)} (p95 ${formatCompact(places.churn.p95)}) · ` +
      `tamaño ${formatCompact(places.size.value)} (p95 ${formatCompact(places.size.p95)}) · ` +
      (places.lint.weight > 0
        ? `lint ${formatCompact(places.lint.value)} (p95 ${formatCompact(places.lint.p95)})`
        : "lint sin medir")
  };

  if (!model) return [risk];

  const rows = model.metrics.map((metric, index) => {
    const value = file.values[index] ?? null;
    return {
      key: metric.key,
      title: metricTitle(metric.key),
      value,
      share: metricShare(value, metric),
      state: metricState(value, metric),
      area: metric.key === areaMetric,
      risk: false,
      description: metric.description ?? "Métrica del modelo.",
      hint:
        `mín. ${formatCompact(metric.min)} · p95 ${formatCompact(metric.p95)} · ` +
        `máx. ${formatCompact(metric.actualMax)} · ` +
        `${formatCompact(metric.coverage)} de ${formatCompact(model.files.length)} ficheros`
    };
  });

  const position = (key: string) => {
    const index = ROW_ORDER.indexOf(key);
    return index < 0 ? ROW_ORDER.length : index;
  };
  rows.sort((left, right) => position(left.key) - position(right.key));

  return [risk, ...rows];
}
