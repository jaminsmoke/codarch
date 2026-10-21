import { describe, expect, it } from "vitest";
import { buildChains, parseCcJson, type ChainStep } from "../src/index";
import type { CcJson, CcSymbol } from "../src/types";

/** Un símbolo de prueba. */
function symbol(
  name: string,
  hash: string,
  extra: Partial<CcSymbol> = {}
): CcSymbol {
  return {
    name,
    kind: "function",
    line: 1,
    hash,
    complexity: 1,
    lines: 3,
    ...extra
  };
}

/** Un snapshot con un solo fichero y los símbolos que se le pasen. */
function snapshot(symbols: CcSymbol[], file = "src/a.ts"): CcJson {
  // El árbol se construye con la ruta de verdad, para que la mudanza se vea.
  const segments = file.split("/");
  const name = segments.pop() as string;
  let parent: CcJson["files"][number] = {
    id: "root",
    name: "proj",
    type: "Folder",
    children: []
  };
  const root = parent;
  for (const segment of segments) {
    const folder: CcJson["files"][number] = {
      id: `folder-${segment}`,
      name: segment,
      type: "Folder",
      children: []
    };
    parent.children?.push(folder);
    parent = folder;
  }
  parent.children?.push({ id: "file", name, type: "File" });

  return parseCcJson({
    meta: {
      projectName: "proj",
      apiVersion: "2.0",
      checksum: "c"
    },
    files: [root],
    lenses: {
      metrics: { attributes: { file: { rloc: 10 } } },
      dependency: { edges: [] },
      symbols: {
        nodes: { file: symbols },
        summary: {
          symbols: symbols.length,
          functions: symbols.length,
          classes: 0,
          interfaces: 0,
          types: 0,
          enums: 0,
          mostComplex: null
        }
      }
    }
  });
}

function step(
  entry: string,
  symbols: CcSymbol[],
  file?: string
): ChainStep {
  return {
    entry,
    date: `2026-01-0${entry}T00:00:00.000Z`,
    commit: entry,
    snapshot: snapshot(symbols, file)
  };
}

describe("la vida de un símbolo", () => {
  it("una función que no cambia tiene una cadena de dos versiones iguales", () => {
    const chains = buildChains([
      step("1", [symbol("cargar", "h1")]),
      step("2", [symbol("cargar", "h1")])
    ]);

    expect(chains).toHaveLength(1);
    const chain = chains[0];
    expect(chain?.name).toBe("cargar");
    expect(chain?.versions).toHaveLength(2);
    expect(chain?.versions[0]?.events.map((event) => event.type)).toEqual([
      "created"
    ]);
    expect(chain?.versions[1]?.events.map((event) => event.type)).toEqual([
      "unchanged"
    ]);
  });

  it("un renombrado conserva la cadena y lo dice", () => {
    const chains = buildChains([
      step("1", [symbol("cargar", "h1")]),
      step("2", [symbol("buscar", "h1")])
    ]);

    expect(chains).toHaveLength(1);
    const chain = chains[0];
    expect(chain?.name).toBe("buscar");
    expect(chain?.versions).toHaveLength(2);
    expect(chain?.versions[1]?.events.map((event) => event.type)).toEqual([
      "renamed"
    ]);
    expect(chain?.versions[1]?.events[0]?.fromName).toBe("cargar");
  });

  it("una mudanza conserva la cadena y lo dice", () => {
    const chains = buildChains([
      step("1", [symbol("cargar", "h1")], "src/a.ts"),
      step("2", [symbol("cargar", "h1")], "src/b.ts")
    ]);

    const chain = chains[0];
    expect(chain?.versions[1]?.events.map((event) => event.type)).toEqual([
      "moved"
    ]);
    expect(chain?.versions[1]?.events[0]?.fromPath).toBe("src/a.ts");
  });

  it("un cambio de cuerpo dice cuánto cambió la complejidad", () => {
    const chains = buildChains([
      step("1", [symbol("cargar", "h1", { complexity: 4 })]),
      step("2", [symbol("cargar", "h2", { complexity: 9 })])
    ]);

    const chain = chains[0];
    expect(chain?.versions[1]?.events.map((event) => event.type)).toEqual([
      "changed"
    ]);
    expect(chain?.versions[1]?.events[0]?.complexityDelta).toBe(5);
  });

  it("un símbolo que desaparece cierra su cadena", () => {
    const chains = buildChains([
      step("1", [symbol("cargar", "h1"), symbol("otra", "h2")]),
      step("2", [symbol("otra", "h2")])
    ]);

    const cargar = chains.find((chain) => chain.name === "cargar");
    expect(cargar?.versions).toHaveLength(2);
    expect(cargar?.versions[1]?.events.map((event) => event.type)).toEqual([
      "removed"
    ]);
  });

  it("un símbolo nuevo nace con su propia cadena", () => {
    const chains = buildChains([
      step("1", [symbol("cargar", "h1")]),
      step("2", [symbol("cargar", "h1"), symbol("nueva", "h2")])
    ]);

    expect(chains).toHaveLength(2);
    const nueva = chains.find((chain) => chain.name === "nueva");
    expect(nueva?.versions[0]?.events.map((event) => event.type)).toEqual([
      "created"
    ]);
  });

  it("una reescritura total es una que se quitó y otra que se añadió", () => {
    const chains = buildChains([
      step("1", [symbol("cargar", "h1")]),
      step("2", [symbol("cargar", "h2")])
    ]);

    // Mismo nombre pero cuerpo del todo distinto: no se inventa continuity ✓.
    expect(chains).toHaveLength(1);
    expect(chains[0]?.versions[1]?.events.map((event) => event.type)).toEqual([
      "changed"
    ]);
  });

  it("la cabeza de la cadena cambia con cada versión y encadena la anterior", () => {
    const chains = buildChains([
      step("1", [symbol("cargar", "h1")]),
      step("2", [symbol("cargar", "h2")])
    ]);

    const versions = chains[0]?.versions ?? [];
    expect(versions[0]?.head).not.toBe(versions[1]?.head);
    expect(versions[1]?.head).toMatch(/^[0-9a-f]{64}$/);
  });
});
