import type { CcMigrationLens } from "@codarch/schema/browser";
import {
  metricColor,
  riskColor,
  sectionColor,
  type RenderFile,
  type RenderModel
} from "@codarch/render/browser";
import { CHURN_METRIC, STATUS_COLOR } from "./labels";

/** El índice de las métricas por clave ✓. */
export function metricIndexOf(model: RenderModel): Map<string, number> {
  return new Map(model.metrics.map((metric, index) => [metric.key, index]));
}

/**
 * El color de un fichero, el mismo que en el mapa ✓.
 *
 * Vive aquí para que los plugins dibujen **lo mismo** que el mapa ✓ (ADR 0028 ✓).
 */
export function mapColorFor(
  file: RenderFile,
  colorMode: string,
  model: RenderModel,
  migration: CcMigrationLens | null,
  metricIndex: Map<string, number>
): string {
  if (colorMode === "status") {
    const status = migration?.nodes[file.nodeId]?.status ?? "js";
    return STATUS_COLOR[status];
  }
  if (colorMode === "structure") {
    const section = model.sections[file.section];
    return section ? sectionColor(section) : "#d5d2ca";
  }
  if (colorMode === "churn") {
    // El calor: cuántas veces se ha tocado el fichero.
    const index = metricIndex.get(CHURN_METRIC);
    if (index === undefined) return riskColor(file.risk);
    const metric = model.metrics[index];
    if (!metric) return riskColor(file.risk);
    return metricColor(file.values[index] ?? null, metric);
  }
  if (colorMode === "risk") return riskColor(file.risk);
  const index = metricIndex.get(colorMode);
  if (index === undefined) return riskColor(file.risk);
  const metric = model.metrics[index];
  if (!metric) return riskColor(file.risk);
  return metricColor(file.values[index] ?? null, metric);
}

