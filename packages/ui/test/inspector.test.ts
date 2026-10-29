import { describe, expect, it } from "vitest";
import type { CcSymbol } from "@codarch/schema/browser";
import type { RenderFile, RenderModel } from "@codarch/render/browser";
import { complexityShare, maxComplexity, relatedFiles } from "../src/inspector";

function file(index: number, path: string): RenderFile {
  return { index, path, name: path.split("/").pop() ?? path } as RenderFile;
}

const a = file(0, "src/a.ts");
const b = file(1, "src/b.ts");
const c = file(2, "src/c.ts");

function model(
  edges: Array<{ from: number; to: number }>
): RenderModel {
  return { files: [a, b, c], edges } as unknown as RenderModel;
}

function symbol(overrides: Partial<CcSymbol>): CcSymbol {
  return { name: "cargar", kind: "function", line: 1, ...overrides };
}

describe("relatedFiles", () => {
  it("saca los destinos del fichero, ordenados por ruta", () => {
    const found = relatedFiles(model([{ from: 0, to: 2 }, { from: 0, to: 1 }]), a, "out");
    expect(found.map((entry) => entry.path)).toEqual([
      "src/b.ts",
      "src/c.ts"
    ]);
  });

  it("saca los que lo usan cuando se mira hacia dentro", () => {
    const found = relatedFiles(model([{ from: 1, to: 0 }, { from: 0, to: 2 }]), a, "in");
    expect(found.map((entry) => entry.path)).toEqual(["src/b.ts"]);
  });

  it("no repite una ruta con dos aristas", () => {
    const found = relatedFiles(
      model([{ from: 0, to: 1 }, { from: 0, to: 1 }]),
      a,
      "out"
    );
    expect(found.map((entry) => entry.path)).toEqual(["src/b.ts"]);
  });

  it("sin modelo o sin aristas no hay nada", () => {
    expect(relatedFiles(null, a, "out")).toEqual([]);
    expect(relatedFiles(model([]), c, "out")).toEqual([]);
  });
});

describe("maxComplexity", () => {
  it("toma el símbolo más pesado e ignora los que no miden", () => {
    expect(
      maxComplexity([
        symbol({ complexity: 4 }),
        symbol({ name: "Guardar", kind: "interface", line: 9 }),
        symbol({ complexity: 20 })
      ])
    ).toBe(20);
  });

  it("sin símbolos, cero", () => {
    expect(maxComplexity([])).toBe(0);
  });
});

describe("complexityShare", () => {
  it("da el porcentaje sobre el más pesado", () => {
    expect(complexityShare(5, 10)).toBe(50);
    expect(complexityShare(20, 20)).toBe(100);
  });

  it("sin símbolo que mida o sin máximo, la barra queda vacía", () => {
    expect(complexityShare(undefined, 10)).toBe(0);
    expect(complexityShare(3, 0)).toBe(0);
  });
});
