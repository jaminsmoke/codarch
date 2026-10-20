import type { CcNode, FileEntry } from "./types";

/**
 * Recorre el árbol en profundidad preservando el orden de `children`.
 * Visita ficheros y carpetas.
 */
export function walkTree(roots: CcNode[], visit: (entry: FileEntry) => void): void {
  const stack: FileEntry[] = roots
    .map((node) => ({ node, path: node.name, depth: 0 }))
    .reverse();

  while (stack.length > 0) {
    const entry = stack.pop() as FileEntry;
    visit(entry);

    const children = entry.node.children;
    if (!children || children.length === 0) continue;

    for (let index = children.length - 1; index >= 0; index--) {
      const child = children[index] as CcNode;
      stack.push({
        node: child,
        path: `${entry.path}/${child.name}`,
        depth: entry.depth + 1
      });
    }
  }
}

/** Recorre solo los ficheros (hojas). */
export function walkFiles(roots: CcNode[], visit: (entry: FileEntry) => void): void {
  walkTree(roots, (entry) => {
    if (entry.node.type === "File") visit(entry);
  });
}

/** Mapa id → ruta completa. Útil para unir lentes al árbol. */
export function pathById(roots: CcNode[]): Map<string, string> {
  const map = new Map<string, string>();
  walkTree(roots, (entry) => map.set(entry.node.id, entry.path));
  return map;
}
