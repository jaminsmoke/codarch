import { describe, expect, it } from "vitest";
import { nextCell, type CellBox } from "../src/navigation";

/**
 * Layout de ejemplo: dos filas de dos celdas.
 *
 *   0 (0,0 40x40)   1 (40,0 60x40)
 *   2 (0,40 40x60)  3 (40,40 60x60)
 */
const cells: CellBox[] = [
  { index: 0, x: 0, y: 0, w: 40, h: 40 },
  { index: 1, x: 40, y: 0, w: 60, h: 40 },
  { index: 2, x: 0, y: 40, w: 40, h: 60 },
  { index: 3, x: 40, y: 40, w: 60, h: 60 }
];

describe("navegación por flechas", () => {
  it("va a la derecha staying en la misma fila", () => {
    expect(nextCell(cells, 0, "right")).toBe(1);
    expect(nextCell(cells, 2, "right")).toBe(3);
  });

  it("va a la izquierda", () => {
    expect(nextCell(cells, 1, "left")).toBe(0);
    expect(nextCell(cells, 3, "left")).toBe(2);
  });

  it("va arriba y abajo", () => {
    expect(nextCell(cells, 2, "up")).toBe(0);
    expect(nextCell(cells, 3, "up")).toBe(1);
    expect(nextCell(cells, 0, "down")).toBe(2);
    expect(nextCell(cells, 1, "down")).toBe(3);
  });

  it("se queda donde está si no hay celda en esa dirección", () => {
    expect(nextCell(cells, 0, "left")).toBe(0);
    expect(nextCell(cells, 0, "up")).toBe(0);
    expect(nextCell(cells, 3, "right")).toBe(3);
    expect(nextCell(cells, 3, "down")).toBe(3);
  });

  it("sin selección elige la primera celda", () => {
    expect(nextCell(cells, null, "right")).toBe(0);
  });

  it("devuelve null sin celdas", () => {
    expect(nextCell([], null, "right")).toBeNull();
    expect(nextCell([], 0, "down")).toBeNull();
  });

  it("prefiere la celda que comparte banda", () => {
    const filas: CellBox[] = [
      { index: 0, x: 0, y: 0, w: 30, h: 30 },
      { index: 1, x: 30, y: 0, w: 30, h: 30 },
      { index: 2, x: 60, y: 0, w: 40, h: 30 },
      { index: 3, x: 0, y: 30, w: 30, h: 70 },
      { index: 4, x: 30, y: 30, w: 30, h: 30 },
      { index: 5, x: 60, y: 30, w: 40, h: 70 }
    ];
    // A la derecha de 1 está 2 (misma fila) y 5 (fila de abajo).
    expect(nextCell(filas, 1, "right")).toBe(2);
    // Abajo de 1 está 4 (misma columna) y 5.
    expect(nextCell(filas, 1, "down")).toBe(4);
    // Arriba de 4 está 1 (misma columna) y 2 (columna contigua).
    expect(nextCell(filas, 4, "up")).toBe(1);
  });
});
