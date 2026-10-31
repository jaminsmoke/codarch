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

/** El orden de las tintas: un subárbol se queda con la peor de sus ficheros. */
const STATE_RANK: Record<MetricState, number> = {
  none: 0,
  ok: 1,
  watch: 2,
  debt: 3
};

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
 * Las métricas que ya son un máximo por fichero.
 *
 * Sumarlas diría una cifra que no existe: la complejidad de una carpeta no es
 * la suma de las complejidades de sus ficheros. Se enseña el máximo y el fichero
 * que lo tiene. El resto sí se suma, que es lo que significa un total.
 */
const MAX_METRICS = new Set([
  "maxComplexity",
  "max_complexity_per_function",
  "maxFunctionLength",
  "dependencyLevel",
  "inCycle",
  "cycleSize"
]);

/** Una fila de la tabla de métricas de proyecto y carpeta. */
export interface RollupMetricRow {
  key: string;
  title: string;
  /** La suma —o el máximo— del subárbol; `null` si ningún fichero la trae. */
  value: number | null;
  /** Ficheros del subárbol que declaran la métrica. */
  files: number;
  /** La barra, de 0 a 1: la parte de los ficheros que traen la métrica. */
  share: number;
  /** La métrica que decide el área del mapa. */
  area: boolean;
  /** El fichero donde está el máximo, cuando la métrica no se suma. */
  owner: string | null;
  /**
   * La tinta de la fila.
   *
   * Una suma no se puede comparar con el p95 de un fichero sin mentir, así que
   * la tinta la pone el **peor fichero** del subárbol: dice si dentro hay deuda,
   * no que el total lo sea. En un máximo —la complejidad, la función más
   * larga— el peor fichero es el máximo, y la regla coincide con la del fichero.
   */
  state: MetricState;
  /** El fichero que pone la tinta, si la pone uno. */
  worst: string | null;
  description: string;
  hint: string;
}

/**
 * Las filas de Métricas en proyecto y carpeta.
 *
 * Es la tabla del fichero con otro sujeto: mismo formato —nombre, barra y
 * valor—, pero lo que se cuenta son las sumas del subárbol. La barra pasa a ser
 * la **cobertura**: la parte de los ficheros que declara la métrica. Un valor
 * sumado no se puede comparar con el p95 de un fichero sin mentir, así que la
 * escala es la que sí se puede leer.
 *
 * La complejidad se añade aunque el snapshot no la traiga como métrica: es el
 * único máximo que el modelo ya tiene por fichero y el ADR 0095 pide enseñarlo
 * con su dueño.
 */
export function rollupMetricRows(
  model: RenderModel,
  files: readonly RenderFile[],
  metricTitle: (key: string) => string
): RollupMetricRow[] {
  const rows: RollupMetricRow[] = [];
  const hasComplexityMetric = model.metrics.some(
    (metric) => metric.key === "maxComplexity"
  );

  if (!hasComplexityMetric) rows.push(complexityRow(files, model.areaMetric));

  model.metrics.forEach((metric, index) => {
    const maxed = MAX_METRICS.has(metric.key);
    let total = 0;
    let top: number | null = null;
    let owner: string | null = null;
    let seen = 0;
    let state: MetricState = "none";
    let worst: string | null = null;
    let worstValue = 0;
    for (const file of files) {
      const value = file.values[index];
      if (value === null || value === undefined) continue;
      seen += 1;
      total += value;
      if (maxed && (top === null || value > top)) {
        top = value;
        // Un cero medido no tiene dueño: nombrar el primer fichero que lo trae
        // diría que ahí está el máximo, y el máximo es que no hay ninguno.
        owner = value > 0 ? file.path : null;
      }
      const fileState = metricState(value, metric);
      if (STATE_RANK[fileState] > STATE_RANK[state]) {
        state = fileState;
        worst = file.path;
        worstValue = value;
      }
    }
    const value = seen === 0 ? null : maxed ? top : total;
    // Un máximo ya es la cifra del fichero que lo tiene; en una suma, el nombre
    // solo se enseña si hay tinta que explicar.
    const worstFile = maxed
      ? owner
      : state === "watch" || state === "debt"
        ? worst
        : null;
    rows.push({
      key: metric.key,
      title: metricTitle(metric.key),
      value,
      files: seen,
      share: files.length === 0 ? 0 : seen / files.length,
      area: metric.key === model.areaMetric,
      owner: maxed ? owner : null,
      state,
      worst: worstFile,
      description: metric.description ?? "Métrica del modelo.",
      hint: rollupHint({
        seen,
        total: files.length,
        maxed,
        owner,
        state,
        worst: worstFile,
        worstValue,
        p95: metric.p95
      })
    });
  });

  const position = (key: string) => {
    const index = ROW_ORDER.indexOf(key);
    return index < 0 ? ROW_ORDER.length : index;
  };
  rows.sort((left, right) => position(left.key) - position(right.key));
  return rows;
}

/** La fila de la complejidad cuando el snapshot no la trae como métrica. */
function complexityRow(
  files: readonly RenderFile[],
  areaMetric: string | null
): RollupMetricRow {
  let top: RenderFile | null = null;
  for (const file of files) {
    if (!top || file.complexity > top.complexity) top = file;
  }
  const owner = top && top.complexity > 0 ? top.path : null;
  return {
    key: "maxComplexity",
    title: "Complejidad máx.",
    value: top ? top.complexity : null,
    files: files.length,
    share: files.length === 0 ? 0 : 1,
    area: areaMetric === "maxComplexity",
    owner,
    // Sin métrica de complejidad no hay p95 con el que comparar: el valor se
    // enseña sin tinta, que es lo mismo que hace la tabla del fichero.
    state: "none",
    worst: owner,
    description:
      "La complejidad más alta del subárbol y el fichero que la tiene.",
    hint: !top
      ? "sin datos en este subárbol"
      : owner
        ? `el mayor del subárbol en ${owner}`
        : "el máximo del subárbol es 0"
  };
}

function rollupHint({
  seen,
  total,
  maxed,
  owner,
  state,
  worst,
  worstValue,
  p95
}: {
  seen: number;
  total: number;
  maxed: boolean;
  owner: string | null;
  state: MetricState;
  worst: string | null;
  worstValue: number;
  p95: number;
}): string {
  if (seen === 0) return "sin datos en este subárbol";
  const coverage = `${formatCompact(seen)} de ${formatCompact(total)} ficheros`;
  if (maxed) {
    if (!owner) return `el máximo del subárbol es 0 · ${coverage}`;
    return `máximo del subárbol en ${owner} · ${coverage}`;
  }
  // La tinta de una suma es de su peor fichero: se dice cuál y contra qué p95.
  if (worst && (state === "watch" || state === "debt")) {
    return `suma del subárbol · ${coverage} · el peor, ${worst} (${formatCompact(
      worstValue
    )} sobre p95 ${formatCompact(p95)})`;
  }
  return `suma del subárbol · ${coverage}`;
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
