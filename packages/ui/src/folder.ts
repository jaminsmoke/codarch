/**
 * Lo que se puede decir de una carpeta con el árbol del mapa.
 *
 * El contenido de una carpeta son sus hijos directos: en el mapa se ve su
 * tamaño, aquí su nombre, sus ficheros y la parte que ocupa dentro del padre.
 * Es la composición de la ficha de carpeta (ADR 0092) y no necesita agregar
 * métricas: usa el área y el recuento que ya trae el árbol.
 */

import type { TreeNode } from "@codarch/render/browser";

/** Una fila del contenido de una carpeta. */
export interface FolderRow {
  /** Identidad estable del hijo: `f:12` o `d:src/app`. */
  key: string;
  name: string;
  path: string;
  kind: "file" | "folder";
  /** Ficheros que hay dentro; uno si el hijo es un fichero. */
  files: number;
  /** Parte del área de la carpeta que ocupa el hijo (0..1). */
  share: number;
}

export interface FolderContent {
  rows: FolderRow[];
  /** Hijos que quedan fuera de la lista. */
  hidden: number;
}

/** Cuántos hijos enseña la ficha antes de recortar. */
export const FOLDER_ROWS = 40;

/**
 * Los hijos directos de una carpeta, del que más área ocupa al que menos.
 *
 * El orden es el del treemap —área, luego ruta para desempatar—, así la lista
 * y el mapa cuentan lo mismo de un vistazo. `share` es la parte del padre; con
 * un padre de área cero (una carpeta vacía) es 0 y no se inventa nada.
 */
export function folderContent(
  node: TreeNode,
  limit: number = FOLDER_ROWS
): FolderContent {
  const children = [...(node.children ?? [])].sort(
    (left, right) => right.value - left.value || left.path.localeCompare(right.path)
  );
  const shown = children.slice(0, Math.max(0, limit));

  return {
    rows: shown.map((child) => ({
      key: child.key,
      name: child.name,
      path: child.path,
      kind: child.kind,
      files: child.kind === "file" ? 1 : child.fileCount,
      share: node.value > 0 ? child.value / node.value : 0
    })),
    hidden: children.length - shown.length
  };
}

/** Cuántas carpetas cuelgan directamente de esta. */
export function childFolders(node: TreeNode): number {
  return (node.children ?? []).filter((child) => child.kind === "folder").length;
}

/** Los niveles de ruta que tiene la carpeta: `packages/ui` son dos. */
export function folderDepth(path: string): number {
  return path.split("/").filter(Boolean).length;
}
