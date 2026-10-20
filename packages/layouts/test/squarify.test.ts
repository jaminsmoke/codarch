import { describe, expect, it } from "vitest";
import { squarify, type LayoutItem, type Rect } from "../src/index";

const rect: Rect = { x: 0, y: 0, w: 100, h: 100 };

function area(r: Rect): number {
  return r.w * r.h;
}

describe("squarify", () => {
  it("devuelve vacío para una lista vacía o un área inválida", () => {
    expect(squarify([], rect)).toEqual([]);
    expect(squarify([{ key: "a", value: 1 }], { x: 0, y: 0, w: 0, h: 10 })).toEqual([]);
  });

  it("ignora valores no positivos o no finitos", () => {
    const placed = squarify(
      [
        { key: "a", value: 0 },
        { key: "b", value: -3 },
        { key: "c", value: Number.NaN },
        { key: "d", value: 2 }
      ],
      rect
    );
    expect(placed.map((item) => item.item.key)).toEqual(["d"]);
  });

  it("cubre el rectángulo sin salirse", () => {
    const items: LayoutItem[] = [
      { key: "a", value: 50 },
      { key: "b", value: 30 },
      { key: "c", value: 12 },
      { key: "d", value: 5 },
      { key: "e", value: 3 }
    ];
    const placed = squarify(items, rect);
    expect(placed).toHaveLength(items.length);

    let sum = 0;
    for (const item of placed) {
      expect(item.x).toBeGreaterThanOrEqual(-1e-6);
      expect(item.y).toBeGreaterThanOrEqual(-1e-6);
      expect(item.x + item.w).toBeLessThanOrEqual(100 + 1e-6);
      expect(item.y + item.h).toBeLessThanOrEqual(100 + 1e-6);
      sum += area(item);
    }
    expect(sum).toBeCloseTo(10_000, 4);
  });

  it("no solapa celdas", () => {
    const items: LayoutItem[] = Array.from({ length: 24 }, (_, index) => ({
      key: `n${index}`,
      value: (index % 7) + 1
    }));
    const placed = squarify(items, rect).map((item) => ({
      ...item,
      x2: item.x + item.w,
      y2: item.y + item.h
    }));

    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i]!;
        const b = placed[j]!;
        const overlapX = Math.min(a.x2, b.x2) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y2, b.y2) - Math.max(a.y, b.y);
        expect(overlapX <= 1e-6 || overlapY <= 1e-6).toBe(true);
      }
    }
  });

  it("es determinista", () => {
    const items: LayoutItem[] = [
      { key: "a", value: 4 },
      { key: "b", value: 9 },
      { key: "c", value: 2 }
    ];
    expect(squarify(items, rect)).toEqual(squarify(items, rect));
  });

  it("no muta la entrada", () => {
    const items: LayoutItem[] = [
      { key: "a", value: 1 },
      { key: "b", value: 2 }
    ];
    const copy = structuredClone(items);
    squarify(items, rect);
    expect(items).toEqual(copy);
  });
});
