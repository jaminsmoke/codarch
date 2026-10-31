import type { RuleInput } from "./rules";
import type { CycleComponent, IndexedSnapshot } from "./diff-types";
import { sortedMetrics } from "./diff-shared";

/**
 * El diff traducido a lo que el motor de reglas sabe leer.
 *
 * Las reglas piden ficheros, aristas y ciclos de un lado; el diff ya tiene los
 * tres y no vuelve a buscarlos. Es el único punto donde el reporte suelta su
 * forma de índice para hablar la de las reglas.
 */
export function ruleInput(
  index: IndexedSnapshot,
  cycles: CycleComponent[]
): RuleInput {
  const files = index.nodes.map((id) => ({
    id,
    path: index.paths.get(id) ?? id,
    metrics: sortedMetrics(index.metrics[id])
  }));

  const edges: RuleInput["edges"] = [];
  for (const edge of index.edges.values()) {
    if (!index.paths.has(edge.fromId) || !index.paths.has(edge.toId)) {
      continue;
    }
    edges.push({
      fromId: edge.fromId,
      toId: edge.toId,
      from: index.paths.get(edge.fromId) ?? edge.fromId,
      to: index.paths.get(edge.toId) ?? edge.toId
    });
  }

  return { files, edges, cycles };
}
