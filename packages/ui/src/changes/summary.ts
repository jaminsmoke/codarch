import type { DiffReport } from "@codarch/metrics/browser";
import type { HistoryEntry } from "@codarch/schema/browser";
import type { RenderModel } from "@codarch/render/browser";
import { CHURN_METRIC } from "../labels";

/** Cuántos ficheros lleva la lista de los más tocados. */
const TOUCHED_ROWS = 8;

/**
 * Si el reporte trae algo que enseñar: ficheros, aristas o ciclos.
 *
 * Las reglas no cuentan: no son un cambio del código sino una lectura de la
 * configuración, y viven en la ficha del fichero (ADR 0075). Las métricas y
 * los símbolos tampoco: un cambio de métrica siempre viene con su fichero en
 * `changed`.
 */
export function reportHasChanges(report: DiffReport): boolean {
  const summary = report.summary;
  return (
    summary.addedFiles + summary.removedFiles + summary.changedFiles > 0 ||
    summary.addedEdges + summary.removedEdges > 0 ||
    summary.introducedCycles + summary.fixedCycles > 0
  );
}

/**
 * Las fotos del repo, de la más nueva a la más vieja, con su delta de rloc.
 *
 * El delta se mide contra la foto anterior: lo que trajo esa foto, no el total.
 */
export function historyRows(
  entries: readonly HistoryEntry[]
): Array<{ entry: HistoryEntry; rlocDelta: number | null }> {
  const newestFirst = entries.slice().reverse();
  return newestFirst.map((entry, index) => {
    const older = newestFirst[index + 1];
    return {
      entry,
      rlocDelta: older ? entry.rloc - older.rloc : null
    };
  });
}

/**
 * Los ficheros que más se han tocado, por commits.
 *
 * Es la lista que el raíl tenía como **Más tocados**: churn del snapshot, no
 * del cambio. Se lee con el histórico porque cuenta lo mismo —lo que el repo
 * lleva hecho—, no lo que el árbol tiene ahora mismo.
 */
export function touchedRows(
  model: RenderModel | null | undefined
): Array<{ path: string; commits: number }> {
  if (!model) return [];
  const index = model.metrics.findIndex((metric) => metric.key === CHURN_METRIC);
  if (index < 0) return [];

  return model.files
    .map((file) => ({ path: file.path, commits: file.values[index] ?? 0 }))
    .filter((row) => row.commits > 0)
    .sort(
      (left, right) =>
        right.commits - left.commits || left.path.localeCompare(right.path)
    )
    .slice(0, TOUCHED_ROWS);
}
