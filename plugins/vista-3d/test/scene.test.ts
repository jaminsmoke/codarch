import { describe, expect, it } from "vitest";
import {
  canvasPixelScale,
  colorOf,
  instanceLayout,
  parseColor
} from "../scene";
import type { DrawnBox } from "../volumes";

const box = (overrides: Partial<DrawnBox> = {}): DrawnBox => ({
  path: "src/a.ts",
  kind: "file",
  x: 10,
  y: 0,
  z: 20,
  width: 40,
  height: 8,
  depth: 30,
  color: "#000000",
  collapsed: false,
  ...overrides
});

describe("parseColor (escena)", () => {
  it("acepta hex corto y largo", () => {
    expect(parseColor("#abc")).toEqual([
      0xaa / 255,
      0xbb / 255,
      0xcc / 255
    ]);
    expect(parseColor("#112233")).toEqual([
      0x11 / 255,
      0x22 / 255,
      0x33 / 255
    ]);
  });

  it("acepta rgb y cae al reserva", () => {
    expect(parseColor("rgb(0, 255, 0)")).toEqual([0, 1, 0]);
    expect(parseColor("no-color", [0.2, 0.3, 0.4])).toEqual([0.2, 0.3, 0.4]);
  });
});

describe("colorOf", () => {
  it("deja el color intacto si no está seleccionado", () => {
    expect(colorOf(box({ color: "#ffffff" }), null)).toEqual([1, 1, 1]);
    expect(colorOf(box({ color: "#ffffff" }), "otro.ts")).toEqual([1, 1, 1]);
  });

  it("mezcla con el azul de selección al 60 %", () => {
    // SELECTION_COLOR #2f6fed → (47,111,237)/255; mezcla 0.6 desde negro
    const mixed = colorOf(box({ color: "#000000", path: "src/a.ts" }), "src/a.ts");
    const highlight = parseColor("#2f6fed");
    expect(mixed[0]).toBeCloseTo(highlight[0]! * 0.6, 6);
    expect(mixed[1]).toBeCloseTo(highlight[1]! * 0.6, 6);
    expect(mixed[2]).toBeCloseTo(highlight[2]! * 0.6, 6);
  });
});

describe("instanceLayout", () => {
  it("centra la caja y impone un mínimo de un píxel de mundo", () => {
    const layout = instanceLayout(box({ width: 40, height: 0.2, depth: 30 }), null);
    expect(layout.x).toBe(30);
    expect(layout.y).toBeCloseTo(0.5, 6);
    expect(layout.z).toBe(35);
    expect(layout.width).toBe(39);
    expect(layout.height).toBe(1);
    expect(layout.depth).toBe(29);
  });

  it("una caja de 1×1×1 no se queda en cero", () => {
    const layout = instanceLayout(
      box({ x: 0, y: 0, z: 0, width: 1, height: 1, depth: 1 }),
      null
    );
    expect(layout.width).toBe(1);
    expect(layout.depth).toBe(1);
    expect(layout.height).toBe(1);
  });
});

describe("canvasPixelScale", () => {
  it("sigue al DPR hasta 2× cuando cabe en el techo", () => {
    expect(canvasPixelScale(100, 100, 1)).toBe(1);
    expect(canvasPixelScale(100, 100, 2)).toBe(2);
    expect(canvasPixelScale(100, 100, 3)).toBe(2);
  });

  it("baja la escala si se pasan los megapíxeles", () => {
    // 4000×2000 a 2× = 64 Mpx > 8 Mpx → scale = 2 * sqrt(8/64) = 2 * 0.353... ≈ 0.707
    const scale = canvasPixelScale(4000, 2000, 2, 8_000_000);
    expect(scale).toBeCloseTo(2 * Math.sqrt(8_000_000 / (4000 * 2000 * 4)), 6);
    expect(4000 * 2000 * scale * scale).toBeCloseTo(8_000_000, 0);
  });
});
