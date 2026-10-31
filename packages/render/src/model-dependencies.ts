import type { CcEdge, CcJson } from "@codarch/schema/browser";
import { isRecord, type EdgePair } from "./model-types";

/**
 * Las aristas del grafo, sin repetirlas, y las que el snapshot marca como ciclo.
 *
 * El snapshot ya decide qué aristas son ciclos de ejecución (ADR 0037). No se
 * infiere un ciclo por la sola ida y vuelta: dos imports de tipos pueden
 * apuntarse sin ejecutarse.
 */

function asEdges(value: unknown): CcEdge[] {
  if (!Array.isArray(value)) return [];
  const edges: CcEdge[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    if (typeof item.fromId !== "string" || typeof item.toId !== "string") continue;
    edges.push({
      fromId: item.fromId,
      toId: item.toId,
      ...(item.isCyclic === true ? { isCyclic: true } : {})
    });
  }
  return edges;
}

export function collectDependency(
  cc: CcJson,
  fileIndexById: ReadonlyMap<string, number>,
  fileCount: number,
  warnings: string[]
): { edges: EdgePair[]; cycles: EdgePair[] } {
  const dependency = cc.lenses?.dependency;
  const leafEdges = asEdges(dependency?.leafEdges);
  const rawEdges = leafEdges.length > 0 ? leafEdges : asEdges(dependency?.edges);

  const seen = new Set<number>();
  const edges: EdgePair[] = [];
  const n = fileCount;

  for (const edge of rawEdges) {
    const from = fileIndexById.get(edge.fromId);
    const to = fileIndexById.get(edge.toId);
    if (from === undefined || to === undefined || from === to) continue;
    const key = from * n + to;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ from, to });
    if (edges.length >= 20_000) {
      warnings.push("se han limitado las dependencias a 20.000 aristas");
      break;
    }
  }

  edges.sort((a, b) => a.from - b.from || a.to - b.to);

  const flagged = new Set<number>();
  for (const edge of rawEdges) {
    if (edge.isCyclic !== true) continue;
    const from = fileIndexById.get(edge.fromId);
    const to = fileIndexById.get(edge.toId);
    if (from === undefined || to === undefined) continue;
    flagged.add(from * n + to);
  }

  const cycles: EdgePair[] = [];
  const inCycle = new Set<number>();
  for (const edge of edges) {
    const key = edge.from * n + edge.to;
    if (!flagged.has(key) || inCycle.has(key)) continue;
    inCycle.add(key);
    cycles.push(edge);
  }
  cycles.sort((a, b) => a.from - b.from || a.to - b.to);

  if (rawEdges.length === 0) {
    warnings.push("este cc.json no trae una lente de dependencias utilizable");
  }

  return { edges, cycles };
}
