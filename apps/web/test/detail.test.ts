import { describe, expect, it } from "vitest";
import type { TreeNode } from "@codarch/render/browser";
import { pruneTree } from "../src/detail";

function file(index: number, path: string, area = 10): TreeNode {
  return {
    kind: "file",
    key: `f:${index}`,
    name: path.split("/").pop() ?? path,
    path,
    value: area,
    fileCount: 1,
    section: 0,
    fileIndex: index
  };
}

function folder(
  path: string,
  children: TreeNode[],
  fileCount = children.length
): TreeNode {
  return {
    kind: "folder",
    key: `d:${path}`,
    name: path.split("/").pop() ?? path,
    path,
    value: children.reduce((sum, child) => sum + child.value, 0),
    fileCount,
    section: -1,
    children
  };
}

const options = { maxFiles: 3, maxCells: 2 };

describe("nivel de detalle del mapa", () => {
  it("mantiene el árbol intacto cuando es pequeño", () => {
    const roots = [folder("src", [file(0, "src/a.ts"), file(1, "src/b.ts")])];
    const result = pruneTree(roots, options, 2);
    expect(result.visibleFiles).toBe(2);
    expect(result.hiddenFiles).toBe(0);
    expect(result.collapsedFolders).toBe(0);
    expect(result.roots[0]?.children).toHaveLength(2);
  });

  it("colapsa una carpeta con demasiados ficheros", () => {
    const children = [file(0, "src/a.ts"), file(1, "src/b.ts"), file(2, "src/c.ts"), file(3, "src/d.ts")];
    const roots = [folder("src", children, 4)];
    const result = pruneTree(roots, options, 4);
    // La carpeta se dibuja, sus hijos son bloques sin contenido.
    expect(result.roots[0]?.children).toHaveLength(2);
    expect(result.roots[0]?.children?.[0]?.kind).toBe("file");
    expect(result.roots[0]?.children?.[0]?.children).toBeUndefined();
    expect(result.collapsedFolders).toBe(1);
    // Se dibujan 2 de los 4 ficheros: los otros 2 quedan fuera.
    expect(result.visibleFiles).toBe(2);
    expect(result.hiddenFiles).toBe(2);
  });

  it("conserva el área y el recuento del bloque", () => {
    const inner = folder("src/deep", [file(0, "src/deep/a.ts"), file(1, "src/deep/b.ts")], 2);
    const roots = [folder("src", [inner], 2)];
    const result = pruneTree(roots, { maxFiles: 1, maxCells: 10 }, 2);
    const block = result.roots[0]?.children?.[0];
    expect(block?.value).toBe(inner.value);
    expect(block?.fileCount).toBe(2);
    expect(block?.children).toEqual([]);
  });

  it("descarta las celdas que superan el máximo por nivel", () => {
    const children = [file(0, "src/a.ts", 1), file(1, "src/b.ts", 5), file(2, "src/c.ts", 3)];
    const roots = [folder("src", children, 3)];
    const result = pruneTree(roots, { maxFiles: 0, maxCells: 2 }, 3);
    const kept = result.roots[0]?.children ?? [];
    expect(kept).toHaveLength(2);
    // Se quedan los mayores por área.
    expect(kept.map((node) => node.path)).toEqual(["src/b.ts", "src/c.ts"]);
  });

  it("no cuenta como visibles los ficheros dentro de un bloque", () => {
    const inner = folder("src/deep", [file(0, "src/deep/a.ts")], 1);
    const roots = [folder("src", [inner], 1)];
    const result = pruneTree(roots, { maxFiles: 0, maxCells: 10 }, 1);
    expect(result.visibleFiles).toBe(0);
    expect(result.hiddenFiles).toBe(1);
    expect(result.cells).toBe(2);
  });
});
