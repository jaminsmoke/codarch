import type { TreeNode } from "@codarch/render/browser";

/** Un tramo de la ruta del mapa: la carpeta que se puede abrir. */
export interface FolderCrumb {
  name: string;
  path: string;
}

/**
 * La cadena de carpetas desde la raíz hasta `path`.
 *
 * Se recorre el árbol en vez de partir la ruta por barras: así cada miga es
 * una carpeta que existe de verdad y se puede abrir, y una raíz sintética no
 * aparece como si fuera un nivel escrito a mano. Devuelve vacío si la ruta no
 * está en el árbol (por ejemplo, después de un refresco que la borró).
 */
export function folderTrail(
  nodes: readonly TreeNode[],
  path: string
): FolderCrumb[] {
  const trail: FolderCrumb[] = [];

  const walk = (list: readonly TreeNode[]): boolean => {
    for (const node of list) {
      if (node.kind !== "folder") continue;
      trail.push({ name: node.name, path: node.path });
      if (node.path === path) return true;
      if (node.children && walk(node.children)) return true;
      trail.pop();
    }
    return false;
  };

  return walk(nodes) ? trail : [];
}

/** La carpeta de encima, o `null` si ya es una raíz del mapa. */
export function parentFolder(
  nodes: readonly TreeNode[],
  path: string
): string | null {
  const trail = folderTrail(nodes, path);
  if (trail.length < 2) return null;
  return trail[trail.length - 2]?.path ?? null;
}

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
