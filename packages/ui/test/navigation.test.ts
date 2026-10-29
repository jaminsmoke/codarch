import { describe, expect, it } from "vitest";
import type { PlacedNode, TreeNode } from "@codarch/render/browser";
import { navigableCells, nextCell, type CellBox } from "../src/navigation";

/**
 * Layout de ejemplo: dos filas de dos celdas.
 *
 *   0 (0,0 40x40)   1 (40,0 60x40)
 *   2 (0,40 40x60)  3 (40,40 60x60)
 */
const cells: CellBox[] = [
  { key: "f:0", x: 0, y: 0, w: 40, h: 40 },
  { key: "f:1", x: 40, y: 0, w: 60, h: 40 },
  { key: "f:2", x: 0, y: 40, w: 40, h: 60 },
  { key: "f:3", x: 40, y: 40, w: 60, h: 60 }
];

describe("navegación por flechas", () => {
  it("va a la derecha staying en la misma fila", () => {
    expect(nextCell(cells, "f:0", "right")).toBe("f:1");
    expect(nextCell(cells, "f:2", "right")).toBe("f:3");
  });

  it("va a la izquierda", () => {
    expect(nextCell(cells, "f:1", "left")).toBe("f:0");
    expect(nextCell(cells, "f:3", "left")).toBe("f:2");
  });

  it("va arriba y abajo", () => {
    expect(nextCell(cells, "f:2", "up")).toBe("f:0");
    expect(nextCell(cells, "f:3", "up")).toBe("f:1");
    expect(nextCell(cells, "f:0", "down")).toBe("f:2");
    expect(nextCell(cells, "f:1", "down")).toBe("f:3");
  });

  it("se queda donde está si no hay celda en esa dirección", () => {
    expect(nextCell(cells, "f:0", "left")).toBe("f:0");
    expect(nextCell(cells, "f:0", "up")).toBe("f:0");
    expect(nextCell(cells, "f:3", "right")).toBe("f:3");
    expect(nextCell(cells, "f:3", "down")).toBe("f:3");
  });

  it("sin selección elige la primera celda", () => {
    expect(nextCell(cells, null, "right")).toBe("f:0");
  });

  it("devuelve null sin celdas", () => {
    expect(nextCell([], null, "right")).toBeNull();
    expect(nextCell([], "f:0", "down")).toBeNull();
  });

  it("funciona con carpetas y ficheros mezclados", () => {
    const mixto: CellBox[] = [
      { key: "d:src", x: 0, y: 0, w: 50, h: 50 },
      { key: "d:docs", x: 50, y: 0, w: 50, h: 50 },
      { key: "f:1", x: 0, y: 50, w: 100, h: 50 }
    ];
    expect(nextCell(mixto, "d:src", "right")).toBe("d:docs");
    expect(nextCell(mixto, "d:src", "down")).toBe("f:1");
  });

  it("prefiere la celda que comparte banda", () => {
    const filas: CellBox[] = [
      { key: "f:0", x: 0, y: 0, w: 30, h: 30 },
      { key: "f:1", x: 30, y: 0, w: 30, h: 30 },
      { key: "f:2", x: 60, y: 0, w: 40, h: 30 },
      { key: "f:3", x: 0, y: 30, w: 30, h: 70 },
      { key: "f:4", x: 30, y: 30, w: 30, h: 30 },
      { key: "f:5", x: 60, y: 30, w: 40, h: 70 }
    ];
    // A la derecha de 1 está 2 (misma fila) y 5 (fila de abajo).
    expect(nextCell(filas, "f:1", "right")).toBe("f:2");
    // Abajo de 1 está 4 (misma columna) y 5.
    expect(nextCell(filas, "f:1", "down")).toBe("f:4");
    // Arriba de 4 está 1 (misma columna) y 2 (columna contigua).
    expect(nextCell(filas, "f:4", "up")).toBe("f:1");
  });
});

/** Un nodo dibujado, con el rectángulo que le tocó en el layout. */
function place(
  node: TreeNode,
  x: number,
  y: number,
  w: number,
  h: number,
  children: PlacedNode[] = []
): PlacedNode {
  return { node, rect: { x, y, w, h }, headerHeight: 0, children };
}

function fileNode(key: string, fileIndex?: number): TreeNode {
  return {
    kind: "file",
    key,
    name: key.slice(2),
    path: key.slice(2),
    value: 1,
    fileCount: 1,
    section: 0,
    fileIndex
  };
}

function folderNode(key: string, path: string): TreeNode {
  return {
    kind: "folder",
    key,
    name: path,
    path,
    value: 2,
    fileCount: 2,
    section: 0
  };
}

describe("las celdas navegables del mapa", () => {
  it("un fichero dibujado es una celda con su índice", () => {
    const { targets, targetMeta } = navigableCells([
      place(fileNode("f:3", 3), 0, 0, 50, 50)
    ]);
    expect(targets).toEqual([{ key: "f:3", x: 0, y: 0, w: 50, h: 50 }]);
    expect(targetMeta.get("f:3")).toEqual({ kind: "file", fileIndex: 3 });
  });

  it("una carpeta con hijos no es celda: se navega por dentro", () => {
    const carpeta = place(folderNode("d:src", "src"), 0, 0, 100, 100, [
      place(fileNode("f:0", 0), 0, 0, 50, 100),
      place(fileNode("f:1", 1), 50, 0, 50, 100)
    ]);
    const { targets, targetMeta } = navigableCells([carpeta]);
    expect(targets.map((cell) => cell.key)).toEqual(["f:0", "f:1"]);
    expect(targetMeta.has("d:src")).toBe(false);
  });

  it("una carpeta hoja sí es celda y guarda su ruta", () => {
    const { targets, targetMeta } = navigableCells([
      place(folderNode("d:docs", "docs"), 10, 20, 30, 40)
    ]);
    expect(targets).toEqual([{ key: "d:docs", x: 10, y: 20, w: 30, h: 40 }]);
    expect(targetMeta.get("d:docs")).toEqual({ kind: "folder", path: "docs" });
  });

  it("recorre en orden de dibujado, mezclando ficheros y carpetas hoja", () => {
    const { targets } = navigableCells([
      place(fileNode("f:0", 0), 0, 0, 100, 40),
      place(folderNode("d:docs", "docs"), 0, 40, 100, 60)
    ]);
    expect(targets.map((cell) => cell.key)).toEqual(["f:0", "d:docs"]);
  });

  it("un fichero sin índice no entra: no hay nada que enfocar", () => {
    const { targets, targetMeta } = navigableCells([
      place(fileNode("f:x"), 0, 0, 10, 10)
    ]);
    expect(targets).toEqual([]);
    expect(targetMeta.size).toBe(0);
  });
});
