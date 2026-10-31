import { describe, expect, it } from "vitest";
import { explainModule, getArchitectureMap } from "../src/tools";
import { makeStore } from "./fixtures";

describe("la lente de símbolos", () => {
  it("explica los símbolos de un fichero, de la función más compleja a la más simple", () => {
    const result = explainModule(makeStore(), { path: "src/a.ts" });
    expect(result.symbols).toEqual([
      { name: "cargar", kind: "function", line: 10, complexity: 12, lines: 40 },
      { name: "Guardar", kind: "interface", line: 3 }
    ]);
  });

  it("resume los símbolos del repo y su función más compleja", () => {
    const map = getArchitectureMap(makeStore());
    expect(map.symbols?.available).toBe(true);
    expect(map.symbols?.total).toBe(3);
    expect(map.symbols?.functions).toBe(2);
    expect(map.symbols?.mostComplex[0]).toEqual({
      path: "src/domain/c.ts",
      name: "resolver",
      complexity: 20,
      line: 20
    });
  });
});
