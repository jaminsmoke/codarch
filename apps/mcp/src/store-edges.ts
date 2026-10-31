import type { CcJson } from "@codarch/schema";
import { compareStrings, finiteNumber } from "./store-shared";
import type { StoreEdge, StoreFile } from "./store-types";

export function buildEdges(
  cc: CcJson,
  filesById: ReadonlyMap<string, StoreFile>
): StoreEdge[] {
  const byKey = new Map<string, StoreEdge>();
  for (const edge of cc.lenses?.dependency?.edges ?? []) {
    const from = filesById.get(edge.fromId);
    const to = filesById.get(edge.toId);
    if (!from || !to) continue;
    const weight = finiteNumber(edge.attributes?.weight) ?? 1;
    const typeOnly = finiteNumber(edge.attributes?.typeOnly) ?? 0;
    const key = `${edge.fromId}\u0000${edge.toId}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.weight += weight;
      existing.typeOnly += typeOnly;
      existing.isCyclic = existing.isCyclic || edge.isCyclic === true;
    } else {
      byKey.set(key, {
        fromId: edge.fromId,
        toId: edge.toId,
        from: from.path,
        to: to.path,
        weight,
        typeOnly,
        isCyclic: edge.isCyclic === true
      });
    }
  }
  return [...byKey.values()].sort(
    (left, right) =>
      compareStrings(left.from, right.from) ||
      compareStrings(left.to, right.to)
  );
}

export interface EdgeIndexes {
  outgoing: Map<string, StoreEdge[]>;
  incoming: Map<string, StoreEdge[]>;
}

export function indexEdges(
  files: readonly StoreFile[],
  edges: readonly StoreEdge[]
): EdgeIndexes {
  const outgoing = new Map<string, StoreEdge[]>();
  const incoming = new Map<string, StoreEdge[]>();
  for (const file of files) {
    outgoing.set(file.id, []);
    incoming.set(file.id, []);
  }
  for (const edge of edges) {
    outgoing.get(edge.fromId)?.push(edge);
    incoming.get(edge.toId)?.push(edge);
  }
  return { outgoing, incoming };
}
