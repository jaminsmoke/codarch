import { describe, expect, it } from "vitest";
import type { TreeNode } from "@codarch/render/browser";
import { buildVolumes, countVolumes, lodBoxes, SLAB_HEIGHT } from "../volumes";

const colors = ["#111111", "#222222", "#333333", "#444444"];
const colorFor = (index: number): string => colors[index % colors.length] ?? "#000000";

function file(path: string, index: number, value = 10): TreeNode {
  return {
    kind: "file",
    key: path,
    name: path.slice(path.lastIndexOf("/") + 1),
    path,
    value,
    fileCount: 1,
    section: 0,
    fileIndex: index
  };
}

function folder(path: string, children: TreeNode[], value = 10): TreeNode {
  return {
    kind: "folder",
    key: path,
    name: path,
    path,
    value,
    fileCount: children.reduce((total, child) => total + child.fileCount, 0),
    section: 0,
    children
  };
}

const arbol = [
  folder("src", [
    folder("src/a", [file("src/a/uno.ts", 0), file("src/a/dos.ts", 1)]),
    file("src/index.ts", 2),
    folder("src/b", [file("src/b/tres.ts", 3)])
  ])
];

const entrada = {
  roots: arbol,
  files: [{ risk: 0.1 }, { risk: 0.5 }, { risk: 0 }, { risk: 1 }],
  colorFor,
  fallbackColor: "#cccccc",
  width: 1000,
  height: 700
};

const lejos = { camera: { x: 0, y: 20_000, z: 20_000 }, viewportHeight: 600, fov: 0.9 };
const cerca = { camera: { x: 500, y: 120, z: 640 }, viewportHeight: 600, fov: 0.9 };

describe("los volúmenes de la escena", () => {
  it("cada fichero es una caja y su altura sale del riesgo", () => {
    const roots = buildVolumes(entrada);
    const src = roots[0];
    expect(src?.kind).toBe("folder");
    const a = src?.children.find((child) => child.path === "src/a");
    const uno = a?.children.find((child) => child.path === "src/a/uno.ts");
    expect(uno?.height).toBeCloseTo(2 + 0.1 * 90, 5);
    expect(uno?.color).toBe(colors[0]);
    expect(uno?.children).toEqual([]);
  });

  it("una carpeta plegada mide lo que su hijo más alto y lleva su color", () => {
    const roots = buildVolumes(entrada);
    const a = roots[0]?.children.find((child) => child.path === "src/a");
    expect(a?.kind).toBe("folder");
    expect(a?.height).toBeCloseTo(2 + 0.5 * 90, 5);
    // El hijo más grande manda: dos.ts (riesgo 0,5) es más alto que uno.ts.
    expect(a?.color).toBe(colors[1]);
  });

  it("ordena los hijos por área: lo grande primero", () => {
    const roots = buildVolumes(entrada);
    const areas = roots[0]?.children.map((child) => child.area) ?? [];
    expect(areas).toEqual([...areas].sort((a, b) => b - a));
  });

  it("de lejos, una carpeta es una sola caja", () => {
    const boxes = lodBoxes(buildVolumes(entrada), lejos);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]?.kind).toBe("folder");
    expect(boxes[0]?.collapsed).toBe(true);
    expect(boxes[0]?.height).toBeGreaterThan(SLAB_HEIGHT);
  });

  it("de cerca se abre: su suelo y sus hijos", () => {
    const boxes = lodBoxes(buildVolumes(entrada), cerca);
    const suelo = boxes.find((box) => box.path === "src");
    expect(suelo?.collapsed).toBe(false);
    expect(suelo?.height).toBe(SLAB_HEIGHT);
    expect(boxes.some((box) => box.path === "src/index.ts")).toBe(true);
  });

  it("no abre una carpeta con más hijos de los que caben, y no deja agujeros", () => {
    const raiz = buildVolumes({
      ...entrada,
      roots: [
        folder(
          "grande",
          Array.from({ length: 400 }, (_, index) => file(`grande/f${index}.ts`, 0))
        )
      ]
    });

    const boxes = lodBoxes(raiz, { ...cerca, budget: 50 });
    expect(boxes).toHaveLength(1);
    expect(boxes[0]?.collapsed).toBe(true);
    expect(boxes[0]?.path).toBe("grande");
  });

  it("con presupuesto de sobra dibuja el árbol entero", () => {
    const roots = buildVolumes(entrada);
    const total = countVolumes(roots);
    const boxes = lodBoxes(roots, { ...cerca, budget: 10_000 });
    // Un suelo por carpeta y una caja por fichero; el suelo de la raíz se
    // suma a los hijos.
    expect(boxes.filter((box) => box.kind === "file")).toHaveLength(4);
    expect(boxes.length).toBeLessThanOrEqual(total + 2);
  });
});
