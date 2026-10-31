// El alcance del árbol: bajar a una carpeta, recorrerla y reunir las aristas
// de lo que deja ver. No es una herramienta: es lo que usan las herramientas.

import { ArchitectureStore, McpDataError, type StoreFolder } from "../store";
import { compareStrings } from "./helpers";
import type { EdgeView } from "./types";

export function resolveFolder(
  store: ArchitectureStore,
  folderPath: string,
  original: string
): StoreFolder {
  const folder = store.folder(folderPath);
  if (folder) return folder;
  const target = store.resolveTarget(original);
  if ("id" in target) {
    throw new McpDataError(`"${original}" es un fichero, no una carpeta`);
  }
  return target as StoreFolder;
}

export function walk(
  adjacency: Map<string, Array<{ fromId: string; toId: string }>>,
  seeds: Set<string>,
  depth: number,
  direction: "dependents" | "dependencies"
): Map<
  string,
  { depth: number; directions: Set<"dependents" | "dependencies"> }
> {
  const found = new Map<
    string,
    { depth: number; directions: Set<"dependents" | "dependencies"> }
  >();
  let frontier = new Set(seeds);
  for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
    const next = new Set<string>();
    for (const id of frontier) {
      for (const edge of adjacency.get(id) ?? []) {
        const neighbor =
          direction === "dependents" ? edge.fromId : edge.toId;
        if (seeds.has(neighbor)) continue;
        const existing = found.get(neighbor);
        if (existing) {
          existing.directions.add(direction);
          existing.depth = Math.min(existing.depth, currentDepth);
          continue;
        }
        found.set(neighbor, {
          depth: currentDepth,
          directions: new Set([direction])
        });
        next.add(neighbor);
      }
    }
    if (next.size === 0) break;
    frontier = next;
  }
  return found;
}

export function edgeViews(
  edges: Array<{
    from: string;
    to: string;
    weight: number;
    typeOnly: number;
    isCyclic: boolean;
  }>,
  side: "from" | "to",
  limit: number
): EdgeView[] {
  return edges.slice(0, limit).map((edge) => ({
    path: edge[side],
    weight: edge.weight,
    typeOnly: edge.typeOnly,
    isCyclic: edge.isCyclic
  }));
}

export function aggregateEdgeViews(
  edges: readonly {
    from: string;
    to: string;
    weight: number;
    typeOnly: number;
    isCyclic: boolean;
  }[],
  side: "from" | "to"
): EdgeView[] {
  const byPath = new Map<string, EdgeView>();
  for (const edge of edges) {
    const pathValue = edge[side];
    const existing = byPath.get(pathValue);
    if (existing) {
      existing.weight += edge.weight;
      existing.typeOnly += edge.typeOnly;
      existing.isCyclic = existing.isCyclic || edge.isCyclic;
    } else {
      byPath.set(pathValue, {
        path: pathValue,
        weight: edge.weight,
        typeOnly: edge.typeOnly,
        isCyclic: edge.isCyclic
      });
    }
  }
  return [...byPath.values()].sort(
    (left, right) =>
      right.weight - left.weight || compareStrings(left.path, right.path)
  );
}

export function sortMetrics(
  metrics: Record<string, number>
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(metrics).sort(([left], [right]) => compareStrings(left, right))
  );
}
