import type { CcStats } from "@codarch/schema/browser";
import { defaultMetric } from "@codarch/schema/browser";
import {
  type MetricAttributes,
  isRecord,
  type RenderFile,
  type RenderMetric,
  type RenderOptions,
  RenderError
} from "./model-types";

/**
 * Las métricas del modelo: cuáles viajan, qué título y dirección tienen y qué
 * escala de color les toca.
 *
 * Es la única parte que sabe leer un descriptor del snapshot, para que la
 * escala del mapa y la de la ficha no se calculen en dos sitios.
 */

/**
 * Las métricas que el modelo lleva siempre que el snapshot las tenga.
 *
 * La deuda de migración y los cruces FFI están aquí para que la ficha del
 * fichero tenga su p95 y su barra aunque no sean el modo de color activo
 * (ADR 0060); antes solo entraban al elegirlas para pintar el mapa.
 */
const CURATED_METRICS = [
  "rloc",
  "maxComplexity",
  "max_complexity_per_function",
  "complexity",
  "functions",
  "number_of_functions",
  "maxFunctionLength",
  "loc",
  "imports",
  "externalImports",
  "builtinImports",
  "typeOnlyImports",
  "unresolvedImports",
  "fanIn",
  "fanOut",
  "inCycle",
  "cycleSize",
  "dependencyLevel",
  "migrationDebt",
  "ffiCrossings",
  "duplicatedLines",
  "repeatedLines",
  "number_of_commits",
  "number_of_authors",
  "incoming_dependencies",
  "outgoing_dependencies"
];

/** El valor de una métrica, si está y es un número: si no, no hay valor. */
export function valueOf(
  values: Record<string, number> | undefined,
  key: string | null
): number | undefined {
  if (!key || !values) return undefined;
  const value = values[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * p))
  );
  return sorted[index] ?? 0;
}

/** El título que el snapshot declara para la métrica, o su clave. */
export function metricTitle(
  attributes: Record<string, unknown> | undefined,
  key: string
): string {
  const descriptor = attributes?.[key];
  if (isRecord(descriptor) && typeof descriptor.title === "string" && descriptor.title) {
    return descriptor.title;
  }
  return key;
}

function metricDescription(
  attributes: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const descriptor = attributes?.[key];
  if (
    isRecord(descriptor) &&
    typeof descriptor.description === "string" &&
    descriptor.description
  ) {
    return descriptor.description;
  }
  return undefined;
}

function metricDirection(
  attributes: Record<string, unknown> | undefined,
  key: string
): number {
  const descriptor = attributes?.[key];
  if (isRecord(descriptor) && typeof descriptor.direction === "number") {
    return descriptor.direction;
  }
  return 0;
}

/**
 * La métrica que decide el área: la pedida, o la de mayor cobertura.
 *
 * Una métrica pedida que el snapshot no trae es un error, no una caída al
 * defecto: quien la pidió por la línea de órdenes quiere saberlo.
 */
export function resolveAreaMetric(
  stats: CcStats,
  coverage: ReadonlySet<string>,
  options: RenderOptions
): string | null {
  if (options.areaMetric) {
    if (!coverage.has(options.areaMetric)) {
      throw new RenderError(
        `la métrica de área "${options.areaMetric}" no existe en este cc.json`
      );
    }
    return options.areaMetric;
  }
  return defaultMetric(stats) ?? null;
}

/** Las métricas que el modelo lleva: las curadas y las que el modo activo necesita. */
export function collectMetricKeys(
  coverage: ReadonlySet<string>,
  wanted: {
    areaMetric: string | null;
    complexityKey: string | null;
    churnKey: string | null;
    color: string | undefined;
  }
): string[] {
  const keys: string[] = [];
  const add = (key: string | null): void => {
    if (key && coverage.has(key) && !keys.includes(key)) keys.push(key);
  };

  for (const key of CURATED_METRICS) add(key);
  add(wanted.areaMetric);
  add(wanted.complexityKey);
  add(wanted.churnKey);
  if (wanted.color && wanted.color !== "risk" && wanted.color !== "structure") {
    add(wanted.color);
  }

  return keys;
}

/** La escala de cada métrica: mínimo, p95 y si hay cola suficiente para el log. */
export function buildMetrics(
  keys: readonly string[],
  files: readonly RenderFile[],
  attributes: MetricAttributes,
  descriptors: Record<string, unknown> | undefined
): RenderMetric[] {
  return keys.map((key) => {
    const present = files
      .map((file) => valueOf(attributes[file.nodeId], key))
      .filter((value): value is number => value !== undefined);
    const min = present.length > 0 ? Math.min(...present) : 0;
    const actualMax = present.length > 0 ? Math.max(...present) : 0;
    const p95 = percentile(present, 0.95);
    const skewed = min >= 0 && p95 > 0 && actualMax > p95 * 4;
    const max = skewed ? actualMax : p95 > 0 ? p95 : actualMax;

    return {
      key,
      title: metricTitle(descriptors, key),
      description: metricDescription(descriptors, key),
      direction: metricDirection(descriptors, key),
      min,
      max,
      actualMax,
      p95,
      mode: skewed ? "log" : "linear",
      coverage: present.length
    };
  });
}

/** Los valores de un fichero, alineados con `metrics` para leerlos por índice. */
export function applyMetricValues(
  files: RenderFile[],
  metrics: readonly RenderMetric[],
  attributes: MetricAttributes
): void {
  for (const file of files) {
    const values = attributes[file.nodeId];
    file.values = metrics.map((metric) => valueOf(values, metric.key) ?? null);
  }
}
