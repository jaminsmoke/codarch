import type { CcJson, CcNode } from "@codarch/schema";
import { walkFiles } from "@codarch/schema";
import type { IndexedEdge, IndexedSnapshot } from "./diff-types";
import { compareStrings, finiteNumber } from "./diff-shared";

/**
 * Un cc.json indexado: la ruta de cada nodo, los nodos en orden y las aristas
 * ya agregadas por par.
 *
 * Se hace una vez por lado y el resto del diff lee de aquí. Las aristas se
 * suman por par porque dos import del mismo fichero son una dependencia con
 * peso dos, y el peso es lo que decide si una arista es de ejecución.
 */
export function indexSnapshot(cc: CcJson): IndexedSnapshot {
  const paths = new Map<string, string>();
  for (const root of cc.files) {
    walkFiles([root], (entry) => {
      paths.set(entry.node.id, relativePath(root, entry.path, entry.node));
    });
  }

  const nodes = [...paths.keys()].sort((left, right) =>
    compareStrings(paths.get(left) ?? left, paths.get(right) ?? right)
  );

  const metrics = cc.lenses?.metrics?.attributes ?? {};
  const edges = new Map<string, IndexedEdge>();
  for (const edge of cc.lenses?.dependency?.edges ?? []) {
    const key = edgeKey(edge.fromId, edge.toId);
    const weight = finiteNumber(edge.attributes?.weight) ?? 1;
    const typeOnly = finiteNumber(edge.attributes?.typeOnly) ?? 0;
    const existing = edges.get(key);
    if (existing) {
      existing.weight += weight;
      existing.typeOnly += typeOnly;
      existing.isCyclic = existing.isCyclic || edge.isCyclic === true;
    } else {
      edges.set(key, {
        fromId: edge.fromId,
        toId: edge.toId,
        weight,
        typeOnly,
        isCyclic: edge.isCyclic === true
      });
    }
  }

  return { cc, paths, nodes, metrics, edges };
}

function relativePath(root: CcNode, fullPath: string, leaf: CcNode): string {
  if (fullPath === root.name) return leaf.name;
  const prefix = `${root.name}/`;
  return fullPath.startsWith(prefix)
    ? fullPath.slice(prefix.length)
    : fullPath;
}

export function edgeKey(fromId: string, toId: string): string {
  return `${fromId}\u0000${toId}`;
}
