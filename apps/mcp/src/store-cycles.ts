import type { StoreEdge, StoreFile } from "./store-types";

/**
 * Marca cada fichero con su ciclo de ejecución.
 *
 * Los imports de tipos no cierran un ciclo; un self-loop solo cuenta si tiene
 * una arista de ejecución (ADR 0037).
 */
export function markCycles(
  files: readonly StoreFile[],
  edges: readonly StoreEdge[],
  filesById: ReadonlyMap<string, StoreFile>
): void {
  const adjacency = new Map<string, string[]>();
  const reverse = new Map<string, string[]>();
  for (const file of files) {
    adjacency.set(file.id, []);
    reverse.set(file.id, []);
  }
  for (const edge of edges) {
    // Los ciclos son de ejecución: los imports de tipos no cierran un ciclo.
    if (edge.weight <= edge.typeOnly) continue;
    adjacency.get(edge.fromId)?.push(edge.toId);
    reverse.get(edge.toId)?.push(edge.fromId);
  }
  const selfLoops = new Set(
    edges
      .filter((edge) => edge.fromId === edge.toId && edge.weight > edge.typeOnly)
      .map((edge) => edge.fromId)
  );
  const components = stronglyConnectedComponents(
    files.map((file) => file.id),
    adjacency,
    reverse
  );
  for (const component of components) {
    if (
      component.length <= 1 &&
      !(component.length === 1 && selfLoops.has(component[0] as string))
    ) {
      continue;
    }
    for (const id of component) {
      const file = filesById.get(id);
      if (!file) continue;
      file.inCycle = 1;
      file.cycleSize = component.length;
    }
  }
}

/** Kosaraju iterativo, con la pila explícita. */
function stronglyConnectedComponents(
  nodes: readonly string[],
  adjacency: ReadonlyMap<string, readonly string[]>,
  reverse: ReadonlyMap<string, readonly string[]>
): string[][] {
  const visited = new Set<string>();
  const order: string[] = [];

  for (const start of nodes) {
    if (visited.has(start)) continue;
    visited.add(start);
    const stack: Array<{ node: string; index: number }> = [
      { node: start, index: 0 }
    ];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1] as { node: string; index: number };
      const neighbors = adjacency.get(frame.node) ?? [];
      if (frame.index < neighbors.length) {
        const next = neighbors[frame.index] as string;
        frame.index++;
        if (!visited.has(next)) {
          visited.add(next);
          stack.push({ node: next, index: 0 });
        }
      } else {
        order.push(frame.node);
        stack.pop();
      }
    }
  }

  const assigned = new Set<string>();
  const components: string[][] = [];
  for (let index = order.length - 1; index >= 0; index--) {
    const start = order[index] as string;
    if (assigned.has(start)) continue;
    const component: string[] = [];
    const stack = [start];
    assigned.add(start);
    while (stack.length > 0) {
      const node = stack.pop() as string;
      component.push(node);
      for (const previous of reverse.get(node) ?? []) {
        if (!assigned.has(previous)) {
          assigned.add(previous);
          stack.push(previous);
        }
      }
    }
    components.push(component);
  }
  return components;
}
