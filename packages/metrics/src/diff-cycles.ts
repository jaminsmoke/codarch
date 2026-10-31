import type { CycleComponent, IndexedSnapshot } from "./diff-types";
import { compareStrings } from "./diff-shared";

/**
 * Los ciclos de cada lado, agrupados por componente fuertemente conexa, y qué
 * componentes aparecen o desaparecen al comparar.
 *
 * Los ciclos son de ejecución: una arista que solo tiene imports de tipos no se
 * carga y no puede cerrar un ciclo (ADR 0037). El grupo se nombra por sus nodos
 * ordenados, así que un ciclo que sigue igual se reconoce aunque se haya
 * movido de sitio en el fichero.
 */

export interface CycleGroup {
  key: string;
  component: CycleComponent;
}

export function cycleGroups(index: IndexedSnapshot): Map<string, CycleGroup> {
  const adjacency = new Map<string, string[]>();
  const reverse = new Map<string, string[]>();
  for (const node of index.nodes) {
    adjacency.set(node, []);
    reverse.set(node, []);
  }

  for (const edge of index.edges.values()) {
    if (!index.paths.has(edge.fromId) || !index.paths.has(edge.toId)) continue;
    // Los ciclos son de ejecución: una arista que solo tiene imports de tipos
    // no se carga y no puede cerrar un ciclo (ADR 0037).
    if (edge.weight <= edge.typeOnly) continue;
    adjacency.get(edge.fromId)?.push(edge.toId);
    reverse.get(edge.toId)?.push(edge.fromId);
  }

  for (const [node, neighbors] of adjacency) {
    adjacency.set(node, [...new Set(neighbors)].sort(compareStrings));
  }
  for (const [node, neighbors] of reverse) {
    reverse.set(node, [...new Set(neighbors)].sort(compareStrings));
  }

  // Kosaraju iterativo para no romper con cadenas profundas.
  const order = finishingOrder(index.nodes, adjacency);
  return collectCycleGroups(index, order, adjacency, reverse);
}

function finishingOrder(nodes: string[], adjacency: Map<string, string[]>): string[] {
  const visited = new Set<string>();
  const order: string[] = [];

  for (const start of nodes) {
    if (visited.has(start)) continue;
    visited.add(start);
    const stack: Array<{ node: string; neighbors: string[]; next: number }> = [
      { node: start, neighbors: adjacency.get(start) ?? [], next: 0 }
    ];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1] as {
        node: string;
        neighbors: string[];
        next: number;
      };
      if (frame.next < frame.neighbors.length) {
        const next = frame.neighbors[frame.next] as string;
        frame.next++;
        if (!visited.has(next)) {
          visited.add(next);
          stack.push({
            node: next,
            neighbors: adjacency.get(next) ?? [],
            next: 0
          });
        }
      } else {
        order.push(frame.node);
        stack.pop();
      }
    }
  }

  return order;
}

function collectCycleGroups(
  index: IndexedSnapshot,
  order: string[],
  adjacency: Map<string, string[]>,
  reverse: Map<string, string[]>
): Map<string, CycleGroup> {
  const assigned = new Set<string>();
  const groups = new Map<string, CycleGroup>();

  for (let position = order.length - 1; position >= 0; position--) {
    const start = order[position] as string;
    if (assigned.has(start)) continue;

    assigned.add(start);
    const component: string[] = [];
    const stack = [start];

    while (stack.length > 0) {
      const node = stack.pop() as string;
      component.push(node);
      for (const next of reverse.get(node) ?? []) {
        if (assigned.has(next)) continue;
        assigned.add(next);
        stack.push(next);
      }
    }

    const hasSelfLoop = component.some((node) =>
      (adjacency.get(node) ?? []).includes(node)
    );
    if (component.length < 2 && !hasSelfLoop) continue;

    const nodes = component
      .map((id) => ({
        id,
        path: index.paths.get(id) ?? id
      }))
      .sort((left, right) => {
        return (
          compareStrings(left.path, right.path) ||
          compareStrings(left.id, right.id)
        );
      });
    const key = [...component].sort(compareStrings).join("\u0000");
    groups.set(key, { key, component: { size: nodes.length, nodes } });
  }

  return groups;
}

/** Los grupos que están en uno y no en el otro, ordenados por su primer nodo. */
export function cycleDifference(
  present: Map<string, CycleGroup>,
  absent: Map<string, CycleGroup>
): CycleComponent[] {
  const cycles: CycleComponent[] = [];
  for (const [key, group] of present) {
    if (!absent.has(key)) cycles.push(group.component);
  }
  return cycles.sort(compareCycles);
}

function compareCycles(left: CycleComponent, right: CycleComponent): number {
  return (
    compareStrings(
      left.nodes[0]?.path ?? "",
      right.nodes[0]?.path ?? ""
    ) || left.size - right.size
  );
}
