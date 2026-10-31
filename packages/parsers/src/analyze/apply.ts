import type { buildGraph } from "../graph";
import type { buildMigration } from "../migration";
import type { AnalysisState } from "./state";
import type { AnalyzeCoreOptions, ChurnResult } from "./types";

/**
 * Lo que se aplica a los ficheros cuando el recorrido ya terminó.
 *
 * Medir es la primera mitad: el historial, el grafo y la migración se saben
 * cuando están todos los ficheros, así que se escriben en sus métricas al
 * final, en tres pasadas que solo leen.
 */

/** El historial, si el puerto lo trae (el navegador no tiene git). */
export function applyChurn(
  state: AnalysisState,
  churn: AnalyzeCoreOptions["churn"]
): ChurnResult | null {
  if (!churn) return null;
  const result = churn(state.parsedFiles.map((file) => file.relativePath));
  state.warnings.push(...result.warnings);
  for (const file of state.parsedFiles) {
    const metrics = result.metrics.get(file.relativePath);
    if (!metrics) continue;
    file.metrics.number_of_commits = metrics.commits;
    file.metrics.number_of_authors = metrics.authors;
  }
  return result;
}

/** Fan-in, fan-out, ciclos y nivel: lo que dice el grafo de cada fichero. */
export function applyGraph(
  state: AnalysisState,
  graph: ReturnType<typeof buildGraph>
): void {
  for (const file of state.parsedFiles) {
    const metrics = graph.metrics.get(file.relativePath);
    if (!metrics) continue;
    file.metrics.fanIn = metrics.fanIn;
    file.metrics.fanOut = metrics.fanOut;
    file.metrics.inCycle = metrics.inCycle;
    file.metrics.cycleSize = metrics.cycleSize;
    file.metrics.dependencyLevel = metrics.dependencyLevel;
  }
  for (const file of state.migrationFiles) {
    file.fanIn = graph.metrics.get(file.relativePath)?.fanIn ?? 0;
  }
}

/** Los cruces FFI y la deuda de migración de cada fichero. */
export function applyMigration(
  state: AnalysisState,
  migration: ReturnType<typeof buildMigration>
): void {
  for (const file of state.parsedFiles) {
    const node = migration.nodes.get(file.relativePath);
    if (!node) continue;
    file.metrics.ffiCrossings = node.crossings;
    if (node.debt !== undefined) file.metrics.migrationDebt = node.debt;
  }
}
