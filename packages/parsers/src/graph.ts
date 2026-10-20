export interface DependencyLink {
  from: string;
  to: string;
  typeOnly?: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  /** Número de imports que producen esta arista. */
  weight: number;
  /** Cuántos de esos imports son `import type` / `export type`. */
  typeOnly: number;
  isCyclic: boolean;
}

export interface FileGraphMetrics {
  fanIn: number;
  fanOut: number;
  /** 1 si el fichero pertenece a un ciclo (incluido un self-loop). */
  inCycle: number;
  /** Tamaño del componente cíclico; 0 si no está en un ciclo. */
  cycleSize: number;
  /**
   * Nivel en el DAG de componentes: 0 para un componente que nadie importa,
   * y max(nivel de quien importa) + 1 para el resto.
   */
  dependencyLevel: number;
}

export interface GraphResult {
  edges: GraphEdge[];
  metrics: Map<string, FileGraphMetrics>;
  /** Componentes fuertemente conexos de tamaño > 1, o self-loops. */
  cycles: string[][];
}

interface AggregatedEdge {
  from: string;
  to: string;
  weight: number;
  typeOnly: number;
}

/**
 * Construye el grafo interno de dependencias.
 *
 * Deduplica aristas, calcula fan-in/fan-out, detecta componentes fuertemente
 * conexos (ciclos) y asigna un nivel a cada componente en el DAG condensado.
 */
export function buildGraph(
  files: readonly string[],
  links: readonly DependencyLink[]
): GraphResult {
  const nodes = [...new Set(files)].sort(compareStrings);
  const nodeSet = new Set(nodes);
  const edgesByKey = new Map<string, AggregatedEdge>();

  for (const link of links) {
    if (!nodeSet.has(link.from) || !nodeSet.has(link.to)) continue;
    const key = `${link.from}\u0000${link.to}`;
    const existing = edgesByKey.get(key);
    if (existing) {
      existing.weight++;
      if (link.typeOnly) existing.typeOnly++;
    } else {
      edgesByKey.set(key, {
        from: link.from,
        to: link.to,
        weight: 1,
        typeOnly: link.typeOnly ? 1 : 0
      });
    }
  }

  const edges: GraphEdge[] = [...edgesByKey.values()]
    .sort(
      (left, right) =>
        compareStrings(left.from, right.from) || compareStrings(left.to, right.to)
    )
    .map((edge) => ({ ...edge, isCyclic: false }));

  const adjacency = new Map<string, string[]>();
  const reverse = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node, []);
    reverse.set(node, []);
  }
  for (const edge of edges) {
    adjacency.get(edge.from)?.push(edge.to);
    reverse.get(edge.to)?.push(edge.from);
  }
  for (const neighbors of adjacency.values()) neighbors.sort(compareStrings);
  for (const neighbors of reverse.values()) neighbors.sort(compareStrings);

  const components = stronglyConnectedComponents(nodes, adjacency, reverse);
  const componentOf = new Map<string, number>();
  components.forEach((component, index) => {
    for (const node of component) componentOf.set(node, index);
  });

  const selfLoops = new Set(
    edges.filter((edge) => edge.from === edge.to).map((edge) => edge.from)
  );
  const cycleComponents = new Set<number>();
  components.forEach((component, index) => {
    if (
      component.length > 1 ||
      (component.length === 1 && selfLoops.has(component[0] as string))
    ) {
      cycleComponents.add(index);
    }
  });

  const levels = componentLevels(components, edges, componentOf);

  for (const edge of edges) {
    const fromComponent = componentOf.get(edge.from);
    const toComponent = componentOf.get(edge.to);
    edge.isCyclic =
      fromComponent !== undefined &&
      fromComponent === toComponent &&
      cycleComponents.has(fromComponent);
  }

  const metrics = new Map<string, FileGraphMetrics>();
  for (const node of nodes) {
    const component = componentOf.get(node);
    if (component === undefined) continue;
    metrics.set(node, {
      fanIn: reverse.get(node)?.length ?? 0,
      fanOut: adjacency.get(node)?.length ?? 0,
      inCycle: cycleComponents.has(component) ? 1 : 0,
      cycleSize: cycleComponents.has(component)
        ? (components[component]?.length ?? 0)
        : 0,
      dependencyLevel: levels[component] ?? 0
    });
  }

  return {
    edges,
    metrics,
    cycles: components.filter((_, index) => cycleComponents.has(index))
  };
}

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
    const stack: Array<{
      node: string;
      neighbors: readonly string[];
      index: number;
    }> = [{ node: start, neighbors: adjacency.get(start) ?? [], index: 0 }];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1] as (typeof stack)[number];
      if (frame.index < frame.neighbors.length) {
        const next = frame.neighbors[frame.index++] as string;
        if (!visited.has(next)) {
          visited.add(next);
          stack.push({
            node: next,
            neighbors: adjacency.get(next) ?? [],
            index: 0
          });
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

    component.sort(compareStrings);
    components.push(component);
  }

  components.sort((left, right) =>
    compareStrings(left[0] as string, right[0] as string)
  );
  return components;
}

function componentLevels(
  components: readonly string[][],
  edges: readonly GraphEdge[],
  componentOf: ReadonlyMap<string, number>
): number[] {
  const condensation = new Map<number, Set<number>>();
  const indegree = new Array<number>(components.length).fill(0);

  for (const edge of edges) {
    const from = componentOf.get(edge.from);
    const to = componentOf.get(edge.to);
    if (from === undefined || to === undefined || from === to) continue;

    const neighbors = condensation.get(from) ?? new Set<number>();
    if (!neighbors.has(to)) {
      neighbors.add(to);
      condensation.set(from, neighbors);
      indegree[to] = (indegree[to] ?? 0) + 1;
    }
  }

  const levels = new Array<number>(components.length).fill(0);
  const queue: number[] = [];
  for (let index = 0; index < components.length; index++) {
    if (indegree[index] === 0) queue.push(index);
  }

  let cursor = 0;
  while (cursor < queue.length) {
    const current = queue[cursor++] as number;
    const neighbors = [...(condensation.get(current) ?? [])].sort(
      (left, right) => left - right
    );
    for (const next of neighbors) {
      levels[next] = Math.max(levels[next] ?? 0, (levels[current] ?? 0) + 1);
      indegree[next] = (indegree[next] ?? 0) - 1;
      if (indegree[next] === 0) queue.push(next);
    }
  }

  return levels;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
