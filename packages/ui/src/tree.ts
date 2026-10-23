import type { TreeNode } from "@codarch/render/browser";

/** Encuentra una carpeta por su ruta en el árbol del mapa ✓. */
export function findFolder(
  nodes: readonly TreeNode[],
  path: string
): TreeNode | null {
  for (const node of nodes) {
    if (node.kind === "folder" && node.path === path) return node;
    if (node.children) {
      const found = findFolder(node.children, path);
      if (found) return found;
    }
  }
  return null;
}
