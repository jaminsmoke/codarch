import { squarify, type Rect } from "@codarch/layouts";
import type { TreeNode } from "./model";

export const VIEW_WIDTH = 1400;
export const VIEW_HEIGHT = 900;
export const VIEW_PADDING = 8;

const MAX_DEPTH = 12;

export interface PlacedNode {
  node: TreeNode;
  rect: Rect;
  /** Altura reservada para la cabecera de la carpeta. 0 si no cabe. */
  headerHeight: number;
  children: PlacedNode[];
}

/**
 * Layout recursivo del árbol.
 *
 * Las carpetas reservan una cabecera solo cuando hay sitio; si el hueco interior es
 * demasiado pequeño se deja de descender y la carpeta queda como bloque agregado.
 * Así un repo de 2.000 ficheros no produce etiquetas de 2 px.
 */
export function layoutMap(
  roots: readonly TreeNode[],
  width = VIEW_WIDTH,
  height = VIEW_HEIGHT
): PlacedNode[] {
  const rect: Rect = {
    x: VIEW_PADDING,
    y: VIEW_PADDING,
    w: Math.max(1, width - VIEW_PADDING * 2),
    h: Math.max(1, height - VIEW_PADDING * 2)
  };
  return layoutChildren(roots, rect, 0);
}

function layoutChildren(
  nodes: readonly TreeNode[],
  rect: Rect,
  depth: number
): PlacedNode[] {
  if (nodes.length === 0 || rect.w < 2 || rect.h < 2) return [];

  const items = nodes.map((node) => ({
    key: node.key,
    value: Math.max(1, node.value),
    node
  }));

  return squarify(items, rect).map((placed) =>
    layoutNode(placed.item.node, {
      x: placed.x,
      y: placed.y,
      w: placed.w,
      h: placed.h
    }, depth)
  );
}

function layoutNode(node: TreeNode, rect: Rect, depth: number): PlacedNode {
  if (node.kind === "file" || !node.children || node.children.length === 0) {
    return { node, rect, headerHeight: 0, children: [] };
  }

  let headerHeight = 0;
  if (rect.w >= 30 && rect.h >= 32) {
    headerHeight = rect.h >= 62 ? 17 : 13;
  }

  const inner: Rect = {
    x: rect.x + 1,
    y: rect.y + headerHeight + 1,
    w: Math.max(0, rect.w - 2),
    h: Math.max(0, rect.h - headerHeight - 2)
  };

  const children =
    depth < MAX_DEPTH && inner.w >= 1 && inner.h >= 1
      ? layoutChildren(node.children, inner, depth + 1)
      : [];

  return { node, rect, headerHeight, children };
}
