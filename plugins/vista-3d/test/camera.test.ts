import { describe, expect, it } from "vitest";
import {
  lookAt,
  normalize,
  perspective,
  pickBox,
  rayBoxDistance,
  rayFromNdc,
  type Ray
} from "../camera";
import { parseColor } from "../scene";
import type { DrawnBox } from "../volumes";

const box = (overrides: Partial<DrawnBox> = {}): DrawnBox => ({
  path: "src/a.ts",
  kind: "file",
  x: 0,
  y: 0,
  z: 0,
  width: 10,
  height: 10,
  depth: 10,
  color: "#7aa2f7",
  collapsed: false,
  ...overrides
});

describe("la cámara del 3D", () => {
  it("normaliza un vector y deja quieto el vector cero", () => {
    const unit = normalize({ x: 0, y: 3, z: 4 });
    expect(Math.hypot(unit.x, unit.y, unit.z)).toBeCloseTo(1, 6);
    expect(normalize({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("proyecta con el campo de visión vertical", () => {
    const matrix = perspective(Math.PI / 2, 1, 1, 11);
    expect(matrix[0]).toBeCloseTo(1, 6);
    expect(matrix[5]).toBeCloseTo(1, 6);
    expect(matrix[10]).toBeCloseTo(-1.2, 6);
    expect(matrix[11]).toBe(-1);
    expect(matrix[14]).toBeCloseTo(-2.2, 6);
  });

  it("una pantalla ancha reparte el campo de visión en horizontal", () => {
    const matrix = perspective(Math.PI / 2, 2, 1, 11);
    expect(matrix[5]).toBeCloseTo(1, 6);
    expect(matrix[0]).toBeCloseTo(0.5, 6);
  });

  it("mira al objetivo desde la cámara", () => {
    const matrix = lookAt({ x: 0, y: 0, z: 10 }, { x: 0, y: 0, z: 0 });
    // El origen, visto desde (0, 0, 10), queda 10 unidades delante (−Z).
    const eye = transform(matrix, { x: 0, y: 0, z: 0 });
    expect(eye.z).toBeCloseTo(-10, 6);
    expect(eye.x).toBeCloseTo(0, 6);
    expect(eye.y).toBeCloseTo(0, 6);
  });

  it("el rayo del centro va del ojo al objetivo", () => {
    const ray = rayFromNdc(
      { x: 0, y: 0, z: 10 },
      { x: 0, y: 0, z: 0 },
      0,
      0,
      Math.PI / 2,
      1
    );
    expect(ray.direction.x).toBeCloseTo(0, 6);
    expect(ray.direction.y).toBeCloseTo(0, 6);
    expect(ray.direction.z).toBeCloseTo(-1, 6);
  });

  it("un punto a la derecha de la pantalla inclina el rayo a la derecha", () => {
    const ray = rayFromNdc(
      { x: 0, y: 0, z: 10 },
      { x: 0, y: 0, z: 0 },
      1,
      0,
      Math.PI / 2,
      2
    );
    expect(ray.direction.x).toBeGreaterThan(0);
    expect(Math.hypot(ray.direction.x, ray.direction.y, ray.direction.z)).toBeCloseTo(1, 6);
  });
});

describe("el picking de las cajas", () => {
  it("mide la entrada del rayo en la caja", () => {
    const ray: Ray = {
      origin: { x: 5, y: 5, z: 20 },
      direction: { x: 0, y: 0, z: -1 }
    };
    expect(rayBoxDistance(ray, box())).toBeCloseTo(10, 6);
  });

  it("no toca una caja que queda a un lado", () => {
    const ray: Ray = {
      origin: { x: 20, y: 5, z: 20 },
      direction: { x: 0, y: 0, z: -1 }
    };
    expect(rayBoxDistance(ray, box())).toBeNull();
  });

  it("desde dentro devuelve la salida: la caja sigue delante", () => {
    const ray: Ray = {
      origin: { x: 5, y: 5, z: 5 },
      direction: { x: 0, y: 0, z: -1 }
    };
    expect(rayBoxDistance(ray, box())).toBeCloseTo(5, 6);
  });

  it("un rayo paralelo a una cara no la cruza si está fuera", () => {
    const ray: Ray = {
      origin: { x: 5, y: 20, z: 20 },
      direction: { x: 1, y: 0, z: 0 }
    };
    expect(rayBoxDistance(ray, box())).toBeNull();
  });

  it("elige la caja más cercana", () => {
    const near = box({ path: "cerca", z: 4, depth: 2 });
    const far = box({ path: "lejos", z: 0, depth: 2 });
    const ray: Ray = {
      origin: { x: 5, y: 5, z: 20 },
      direction: { x: 0, y: 0, z: -1 }
    };
    expect(pickBox(ray, [far, near])).toBe(1);
  });

  it("sin choque no hay selección", () => {
    const ray: Ray = {
      origin: { x: 50, y: 50, z: 50 },
      direction: { x: 0, y: 0, z: -1 }
    };
    expect(pickBox(ray, [box()])).toBeNull();
  });
});

describe("el color del tema", () => {
  it("lee un hex de seis dígitos y uno de tres", () => {
    expect(parseColor("#ffffff")).toEqual([1, 1, 1]);
    expect(parseColor("#f00")).toEqual([1, 0, 0]);
  });

  it("lee el rgb que resuelve el navegador", () => {
    const [r, g, b] = parseColor("rgb(255, 128, 0)");
    expect(r).toBe(1);
    expect(g).toBeCloseTo(128 / 255, 6);
    expect(b).toBe(0);
  });

  it("lo que no entiende cae al color de reserva", () => {
    expect(parseColor("oklch(0.9 0.02 200)", [0.1, 0.2, 0.3])).toEqual([
      0.1, 0.2, 0.3
    ]);
  });
});

/** Aplica una matriz en columnas a un punto ✓. */
function transform(
  matrix: Float32Array,
  point: { x: number; y: number; z: number }
): { x: number; y: number; z: number } {
  const x =
    matrix[0]! * point.x +
    matrix[4]! * point.y +
    matrix[8]! * point.z +
    matrix[12]!;
  const y =
    matrix[1]! * point.x +
    matrix[5]! * point.y +
    matrix[9]! * point.z +
    matrix[13]!;
  const z =
    matrix[2]! * point.x +
    matrix[6]! * point.y +
    matrix[10]! * point.z +
    matrix[14]!;
  const w =
    matrix[3]! * point.x +
    matrix[7]! * point.y +
    matrix[11]! * point.z +
    matrix[15]!;
  return { x: x / w, y: y / w, z: z / w };
}
