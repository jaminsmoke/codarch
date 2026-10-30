import { describe, expect, it } from "vitest";
import type { TreeNode } from "@codarch/render/browser";
import {
  childFolderNodes,
  childFolders,
  countFolders,
  folderContent,
  folderDepth
} from "../src/folder";

function file(path: string, value: number, index: number): TreeNode {
  return {
    kind: "file",
    key: `f:${index}`,
    name: path.split("/").at(-1) ?? path,
    path,
    value,
    fileCount: 1,
    section: -1,
    fileIndex: index
  };
}

const folder = (path: string, value: number, children: TreeNode[]): TreeNode => ({
  kind: "folder",
  key: `d:${path}`,
  name: path.split("/").at(-1) ?? path,
  path,
  value,
  fileCount: children.reduce((sum, child) => sum + child.fileCount, 0),
  section: -1,
  children
});

const tree = folder("src", 100, [
  folder("src/small", 10, [file("src/small/a.ts", 10, 2)]),
  file("src/big.ts", 60, 1),
  folder("src/mid", 30, [file("src/mid/b.ts", 20, 3), file("src/mid/c.ts", 10, 4)])
]);

describe("el contenido de una carpeta (ADR 0092)", () => {
  it("ordena como el mapa: de más área a menos", () => {
    expect(folderContent(tree).rows.map((row) => row.name)).toEqual([
      "big.ts",
      "mid",
      "small"
    ]);
  });

  it("da la parte del padre a cada hijo", () => {
    const rows = folderContent(tree).rows;
    expect(rows[0]?.share).toBeCloseTo(0.6);
    expect(rows[1]?.share).toBeCloseTo(0.3);
    expect(rows[2]?.share).toBeCloseTo(0.1);
  });

  it("un fichero cuenta uno y una carpeta cuenta los suyos", () => {
    const rows = folderContent(tree).rows;
    expect(rows[0]?.files).toBe(1);
    expect(rows[1]?.files).toBe(2);
  });

  it("recorta la lista y dice cuántos quedan fuera", () => {
    const content = folderContent(tree, 2);
    expect(content.rows).toHaveLength(2);
    expect(content.hidden).toBe(1);
  });

  it("una carpeta vacía no inventa partes", () => {
    const empty = folder("src/vacia", 0, []);
    expect(folderContent(empty).rows).toEqual([]);
    expect(childFolders(empty)).toBe(0);
  });

  it("cuenta las carpetas que cuelgan directamente", () => {
    expect(childFolders(tree)).toBe(2);
    expect(childFolderNodes(tree).map((node) => node.path)).toEqual([
      "src/small",
      "src/mid"
    ]);
  });

  it("cuenta las carpetas del subárbol, sin contarse a sí misma", () => {
    expect(countFolders(tree)).toBe(2);
    expect(countFolders(tree.children?.[0] as TreeNode)).toBe(0);
  });

  it("mide la profundidad de la ruta", () => {
    expect(folderDepth("packages/ui/src")).toBe(3);
    expect(folderDepth("src")).toBe(1);
  });
});
