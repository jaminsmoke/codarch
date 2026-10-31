import type { DiffReport, EdgeChange, IndexedEdge, IndexedSnapshot } from "./diff-types";
import { compareStrings } from "./diff-shared";

/**
 * Las aristas que aparecen y desaparecen, y cuáles de ellas cierran un ciclo.
 *
 * Una arista se identifica por su par de nodos, así que dos import del mismo
 * destino son la misma arista con más peso. El ciclo se decide por el peso de
 * ejecución, no por la bandera del snapshot (ADR 0037).
 */

export function diffEdges(
  base: IndexedSnapshot,
  head: IndexedSnapshot
): DiffReport["edges"] {
  const added: EdgeChange[] = [];
  const removed: EdgeChange[] = [];

  for (const [key, edge] of head.edges) {
    if (!base.edges.has(key)) added.push(edgeChange(head, edge));
  }
  for (const [key, edge] of base.edges) {
    if (!head.edges.has(key)) removed.push(edgeChange(base, edge));
  }

  added.sort(compareEdgeChanges);
  removed.sort(compareEdgeChanges);

  return {
    added,
    removed,
    cyclicAdded: added.filter((edge) => edge.isCyclic),
    cyclicRemoved: removed.filter((edge) => edge.isCyclic)
  };
}

function edgeChange(index: IndexedSnapshot, edge: IndexedEdge): EdgeChange {
  return {
    fromId: edge.fromId,
    toId: edge.toId,
    from: index.paths.get(edge.fromId) ?? edge.fromId,
    to: index.paths.get(edge.toId) ?? edge.toId,
    weight: edge.weight,
    typeOnly: edge.typeOnly,
    // Un snapshot antiguo pudo marcar un ciclo de tipos; el diff lo corrige
    // con el mismo criterio que el grafo de ejecución (ADR 0037).
    isCyclic: edge.isCyclic && edge.weight > edge.typeOnly
  };
}

function compareEdgeChanges(left: EdgeChange, right: EdgeChange): number {
  return (
    compareStrings(left.from, right.from) ||
    compareStrings(left.to, right.to) ||
    compareStrings(left.fromId, right.fromId) ||
    compareStrings(left.toId, right.toId)
  );
}
