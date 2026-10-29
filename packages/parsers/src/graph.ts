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
  /** Solo se marca si la arista es de ejecución y cae dentro de un ciclo de ejecución. */
  isCyclic: boolean;
}

export interface FileGraphMetrics {
  fanIn: number;
  fanOut: number;
  /** 1 si el fichero pertenece a un ciclo de ejecución (incluido un self-loop). */
  inCycle: number;
  /** Tamaño del componente cíclico de ejecución; 0 si no está en un ciclo. */
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
  /** Componentes fuertemente conexos de ejecución de tamaño > 1, o self-loops. */
  cycles: string[][];
}

interface AggregatedEdge {
  from: string;
  to: string;
  weight: number;
  typeOnly: number;
}

/** Las cuatro listas de vecinos: todas las aristas y solo las de ejecución. */
interface GraphIndex {
  adjacency: Map<string, string[]>;
  reverse: Map<string, string[]>;
  runtime: Map<string, string[]>;
  runtimeReverse: Map<string, string[]>;
}

/**
 * Construye el grafo interno de dependencias.
 *
 * Deduplica aristas y calcula fan-in/fan-out sobre **todos** los imports. Los
 * ciclos, `isCyclic`, `inCycle`, `cycleSize` y `dependencyLevel` salen del
 * **grafo de ejecución**: una arista cuenta si `weight > typeOnly`; las aristas
 * que solo son de tipos se guardan, pero no se ejecutan.
 *
 * Va por pasos, uno por pregunta: qué nodos hay, qué aristas los unen, qué
 * componentes se alcanzan, cuáles son cíclicos y qué mide cada fichero.
 */
export function buildGraph(
  files: readonly string[],
  links: readonly DependencyLink[]
): GraphResult {
  const nodes = uniqueNodes(files);
  const edges = aggregateEdges(links, new Set(nodes));
  const runtimeEdges = edges.filter(isRuntimeEdge);
  const index = buildIndex(nodes, edges);

  const components = stronglyConnectedComponents(
    nodes,
    index.runtime,
    index.runtimeReverse
  );
  const componentOf = componentIndex(components);
  const cyclic = cyclicComponents(components, runtimeEdges);
  const levels = componentLevels(components, runtimeEdges, componentOf);

  gradeEdges(edges, componentOf, cyclic);

  return {
    edges,
    metrics: nodeMetrics({
      nodes,
      index,
      components,
      componentOf,
      cyclic,
      levels
    }),
    cycles: components.filter((_, index) => cyclic.has(index))
  };
}

/** Un nodo por ruta, en orden: el mapa no depende del filesystem. */
function uniqueNodes(files: readonly string[]): string[] {
  return [...new Set(files)].sort(compareStrings);
}

/** Los imports entre nodos, con su peso: cuántos son y cuántos, de tipos. */
function aggregateEdges(
  links: readonly DependencyLink[],
  nodes: ReadonlySet<string>
): GraphEdge[] {
  const edgesByKey = new Map<string, AggregatedEdge>();

  for (const link of links) {
    if (!nodes.has(link.from) || !nodes.has(link.to)) continue;
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

  return [...edgesByKey.values()]
    .sort(
      (left, right) =>
        compareStrings(left.from, right.from) || compareStrings(left.to, right.to)
    )
    .map((edge) => ({ ...edge, isCyclic: false }));
}

/** Las listas de vecinos, con todos los imports y con los que se ejecutan. */
function buildIndex(
  nodes: readonly string[],
  edges: readonly GraphEdge[]
): GraphIndex {
  const index: GraphIndex = {
    adjacency: emptyLists(nodes),
    reverse: emptyLists(nodes),
    runtime: emptyLists(nodes),
    runtimeReverse: emptyLists(nodes)
  };

  for (const edge of edges) {
    index.adjacency.get(edge.from)?.push(edge.to);
    index.reverse.get(edge.to)?.push(edge.from);
    if (!isRuntimeEdge(edge)) continue;
    index.runtime.get(edge.from)?.push(edge.to);
    index.runtimeReverse.get(edge.to)?.push(edge.from);
  }

  for (const lists of [
    index.adjacency,
    index.reverse,
    index.runtime,
    index.runtimeReverse
  ]) {
    for (const neighbors of lists.values()) neighbors.sort(compareStrings);
  }
  return index;
}

function emptyLists(nodes: readonly string[]): Map<string, string[]> {
  const lists = new Map<string, string[]>();
  for (const node of nodes) lists.set(node, []);
  return lists;
}

/** A qué componente va cada nodo. */
function componentIndex(
  components: readonly string[][]
): Map<string, number> {
  const componentOf = new Map<string, number>();
  components.forEach((component, index) => {
    for (const node of component) componentOf.set(node, index);
  });
  return componentOf;
}

/** Los componentes que son un ciclo: más de un nodo, o un self-loop. */
function cyclicComponents(
  components: readonly string[][],
  runtimeEdges: readonly GraphEdge[]
): Set<number> {
  const selfLoops = new Set(
    runtimeEdges
      .filter((edge) => edge.from === edge.to)
      .map((edge) => edge.from)
  );

  const cyclic = new Set<number>();
  components.forEach((component, index) => {
    if (
      component.length > 1 ||
      (component.length === 1 && selfLoops.has(component[0] as string))
    ) {
      cyclic.add(index);
    }
  });
  return cyclic;
}

/** Marca las aristas que caen dentro de un ciclo de ejecución. */
function gradeEdges(
  edges: GraphEdge[],
  componentOf: ReadonlyMap<string, number>,
  cyclic: ReadonlySet<number>
): void {
  for (const edge of edges) {
    const fromComponent = componentOf.get(edge.from);
    const toComponent = componentOf.get(edge.to);
    edge.isCyclic =
      isRuntimeEdge(edge) &&
      fromComponent !== undefined &&
      fromComponent === toComponent &&
      cyclic.has(fromComponent);
  }
}

interface NodeMetricInput {
  nodes: readonly string[];
  index: GraphIndex;
  components: readonly string[][];
  componentOf: ReadonlyMap<string, number>;
  cyclic: ReadonlySet<number>;
  levels: readonly number[];
}

function nodeMetrics(input: NodeMetricInput): Map<string, FileGraphMetrics> {
  const metrics = new Map<string, FileGraphMetrics>();
  for (const node of input.nodes) {
    const component = input.componentOf.get(node);
    if (component === undefined) continue;
    metrics.set(node, metricFor(node, component, input));
  }
  return metrics;
}

/** Lo que mide un fichero: cuántos lo importan, y si está en un ciclo. */
function metricFor(
  node: string,
  component: number,
  input: NodeMetricInput
): FileGraphMetrics {
  const inCycle = input.cyclic.has(component);
  return {
    fanIn: input.index.reverse.get(node)?.length ?? 0,
    fanOut: input.index.adjacency.get(node)?.length ?? 0,
    inCycle: inCycle ? 1 : 0,
    cycleSize: inCycle ? (input.components[component]?.length ?? 0) : 0,
    dependencyLevel: input.levels[component] ?? 0
  };
}

/**
 * Los componentes fuertemente conexos, en dos pasadas de Kosaraju: primero el
 * orden de cierre del recorrido, y luego los componentes hacia atrás.
 */
function stronglyConnectedComponents(
  nodes: readonly string[],
  adjacency: ReadonlyMap<string, readonly string[]>,
  reverse: ReadonlyMap<string, readonly string[]>
): string[][] {
  return collectComponents(finishOrder(nodes, adjacency), reverse);
}

/** El orden en que el recorrido **cierra** cada nodo. */
function finishOrder(
  nodes: readonly string[],
  adjacency: ReadonlyMap<string, readonly string[]>
): string[] {
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
        if (visited.has(next)) continue;
        visited.add(next);
        stack.push({
          node: next,
          neighbors: adjacency.get(next) ?? [],
          index: 0
        });
        continue;
      }
      order.push(frame.node);
      stack.pop();
    }
  }

  return order;
}

/** Los componentes que se alcanzan desde cada nodo, recorriendo al revés. */
function collectComponents(
  order: readonly string[],
  reverse: ReadonlyMap<string, readonly string[]>
): string[][] {
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
        if (assigned.has(previous)) continue;
        assigned.add(previous);
        stack.push(previous);
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

/** Las aristas entre componentes, en una sola dirección por par. */
function condensationOf(
  components: readonly string[][],
  edges: readonly GraphEdge[],
  componentOf: ReadonlyMap<string, number>
): { neighbors: Map<number, Set<number>>; indegree: number[] } {
  const neighbors = new Map<number, Set<number>>();
  const indegree = Array.from<number>({ length: components.length }).fill(0);

  for (const edge of edges) {
    const from = componentOf.get(edge.from);
    const to = componentOf.get(edge.to);
    if (from === undefined || to === undefined || from === to) continue;

    const children = neighbors.get(from) ?? new Set<number>();
    if (children.has(to)) continue;
    children.add(to);
    neighbors.set(from, children);
    indegree[to] = (indegree[to] ?? 0) + 1;
  }

  return { neighbors, indegree };
}

/**
 * El nivel de cada componente en el DAG: 0 para el que nadie importa, y el de
 * quien lo importa más uno para el resto.
 */
function componentLevels(
  components: readonly string[][],
  edges: readonly GraphEdge[],
  componentOf: ReadonlyMap<string, number>
): number[] {
  const { neighbors, indegree } = condensationOf(components, edges, componentOf);
  const levels = Array.from<number>({ length: components.length }).fill(0);
  const queue: number[] = [];
  for (let index = 0; index < components.length; index++) {
    if (indegree[index] === 0) queue.push(index);
  }

  let cursor = 0;
  while (cursor < queue.length) {
    const current = queue[cursor++] as number;
    const children = [...(neighbors.get(current) ?? [])].sort(
      (left, right) => left - right
    );
    for (const next of children) {
      levels[next] = Math.max(levels[next] ?? 0, (levels[current] ?? 0) + 1);
      indegree[next] = (indegree[next] ?? 0) - 1;
      if (indegree[next] === 0) queue.push(next);
    }
  }

  return levels;
}

/** Una arista cuenta para los ciclos si al menos uno de sus imports se ejecuta. */
function isRuntimeEdge(edge: Pick<GraphEdge, "weight" | "typeOnly">): boolean {
  return edge.weight > edge.typeOnly;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
