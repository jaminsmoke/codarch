/**
 * Nivel de detalle del mapa.
 *
 * Un treemap de 20.000 ficheros no es un mapa: es un mosaico de celdas de un
 * píxel que no se puede leer ni pintar rápido. El mapa sigue siendo útil a
 * nivel de carpeta, y el usuario puede bajar a los ficheros entrando en una
 * carpeta.
 *
 * La regla es por tamaño y no por profundidad: un nodo se expande mientras
 * contenga pocos ficheros. Así el mapa siempre cabe en pantalla sin importar
 * lo grande que sea el repositorio.
 */

import type { TreeNode } from "@codarch/render/browser";

export interface DetailOptions {
  /** Un nodo con más ficheros que esto no se expande: sus hijos son bloques. */
  maxFiles: number;
  /** Celdas máximas por nivel; el resto no se dibuja. */
  maxCells: number;
}

export interface DetailResult {
  /** Árbol podado, listo para maquetar. */
  roots: TreeNode[];
  /** Cajas dibujadas (ficheros y carpetas). */
  cells: number;
  /** Ficheros dibujados uno a uno. */
  visibleFiles: number;
  /** Ficheros que existen en el modelo pero no se dibujan. */
  hiddenFiles: number;
  /** Hay carpetasShown que muestran un resumen en lugar de su contenido. */
  collapsedFolders: number;
}

export const DEFAULT_DETAIL_OPTIONS: DetailOptions = {
  maxFiles: 800,
  maxCells: 1500
};

interface Pruned {
  node: TreeNode;
  cells: number;
  visibleFiles: number;
  collapsedFolders: number;
}

/** Un hijo que se dibuja como bloque: conserva su área y su recuento. */
function asBlock(node: TreeNode): TreeNode {
  if (node.kind === "file") return node;
  return {
    kind: "folder",
    key: node.key,
    name: node.name,
    path: node.path,
    value: node.value,
    fileCount: node.fileCount,
    section: node.section,
    children: []
  };
}

function pruneNode(node: TreeNode, options: DetailOptions): Pruned {
  if (node.kind === "file") {
    return { node, cells: 1, visibleFiles: 1, collapsedFolders: 0 };
  }

  const children = node.children ?? [];

  if (node.fileCount <= options.maxFiles) {
    let cells = 0;
    let visibleFiles = 0;
    let collapsedFolders = 0;
    const pruned: TreeNode[] = [];
    for (const child of children) {
      const result = pruneNode(child, options);
      pruned.push(result.node);
      cells += result.cells;
      visibleFiles += result.visibleFiles;
      collapsedFolders += result.collapsedFolders;
    }
    return {
      node: { ...node, children: pruned },
      cells: cells + 1,
      visibleFiles,
      collapsedFolders
    };
  }

  // Demasiado grande: se dibuja un nivel y los hijos quedan como bloques.
  const blocks = children.map(asBlock);
  const kept =
    blocks.length > options.maxCells
      ? [...blocks]
          .sort((left, right) => right.value - left.value || left.path.localeCompare(right.path))
          .slice(0, options.maxCells)
      : blocks;
  const visibleFiles = kept.filter((block) => block.kind === "file").length;
  return {
    node: { ...node, children: kept },
    cells: kept.length + 1,
    visibleFiles,
    collapsedFolders: 1
  };
}

/**
 * Poda el árbol para que el mapa dibuje un número usable de celdas.
 *
 * No modifica el modelo: el snapshot sigue teniendo todos los ficheros, así
 * que la búsqueda, el inspector y los enlaces siguen llegando a cualquiera.
 */
export function pruneTree(
  roots: readonly TreeNode[],
  options: DetailOptions = DEFAULT_DETAIL_OPTIONS,
  totalFiles = 0
): DetailResult {
  let cells = 0;
  let visibleFiles = 0;
  let collapsedFolders = 0;
  const pruned: TreeNode[] = [];

  for (const root of roots) {
    const result = pruneNode(root, options);
    pruned.push(result.node);
    cells += result.cells;
    visibleFiles += result.visibleFiles;
    collapsedFolders += result.collapsedFolders;
  }

  return {
    roots: pruned,
    cells,
    visibleFiles,
    hiddenFiles: Math.max(0, totalFiles - visibleFiles),
    collapsedFolders
  };
}
