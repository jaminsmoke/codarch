import { describe, expect, it } from "vitest";
import { suggestArchitecture } from "../src/tools";
import { makeStore } from "./fixtures";

describe("suggestArchitecture", () => {
  it("deduce las capas del grafo y propone reglas", () => {
    const result = suggestArchitecture(makeStore());

    expect(result.available).toBe(true);
    expect(result.configVersion).toBe(1);
    // El fixture tiene src/domain y src/infra: son las capas que ve el grafo.
    expect(result.detected.map((layer) => layer.name)).toEqual(
      expect.arrayContaining(["src/domain", "src/infra"])
    );
    expect(result.layers.map((layer) => layer.name)).toContain("domain");
    expect(result.rules.length).toBeGreaterThan(0);
    expect(result.fits.map((fit) => fit.id)).toContain("hexagonal");
  });

  it("cuenta los ficheros de cada capa, no sus dependencias", () => {
    const result = suggestArchitecture(makeStore());

    // En el fixture, domain e infra tienen un fichero cada una: las aristas
    // entre ellas (b→c, d→c) no engordan el tamaño que ve el agente.
    expect(
      result.detected.map((layer) => [layer.name, layer.files])
    ).toEqual([
      ["src/domain", 1],
      ["src/infra", 1]
    ]);
    // a.ts y b.ts cuelgan de src, y index.ts de la raíz: no forman capa.
    expect(result.ungrouped).toBe(3);
  });
});
