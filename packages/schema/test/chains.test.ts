import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CC_JSON_VERSION,
  buildChains,
  chainsPayload,
  parseCcJson,
  saveHistory,
  summarizeChains,
  verifyChains,
  type ChainStep,
  type SymbolChain
} from "../src/index";
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
function snapshot(
  symbols: CcSymbol[],
  file = "src/a.ts",
  checksum = "c"
): CcJson {
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
      apiVersion: CC_JSON_VERSION,
      checksum
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
          variables: 0,
          mostComplex: null
        }
      }
    }
  });
}

function step(entry: string, symbols: CcSymbol[], file?: string): ChainStep {
  return {
    entry,
    date: `2026-01-0${entry}T00:00:00.000Z`,
    commit: entry,
    snapshot: snapshot(symbols, file)
  };
}

/** Solo las cadenas de símbolos: los otros niveles se prueban aparte. */
function symbols(chains: SymbolChain[]): SymbolChain[] {
  return chains.filter((chain) => chain.level === "symbol");
}

describe("la vida de un símbolo", () => {
  it("una función que no cambia tiene una cadena de dos versiones iguales", () => {
    const chains = symbols(
      buildChains([
        step("1", [symbol("cargar", "h1")]),
        step("2", [symbol("cargar", "h1")])
      ])
    );

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
    const chains = symbols(
      buildChains([
        step("1", [symbol("cargar", "h1")]),
        step("2", [symbol("buscar", "h1")])
      ])
    );

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
    const chains = symbols(
      buildChains([
        step("1", [symbol("cargar", "h1")], "src/a.ts"),
        step("2", [symbol("cargar", "h1")], "src/b.ts")
      ])
    );

    const chain = chains[0];
    expect(chain?.versions[1]?.events.map((event) => event.type)).toEqual([
      "moved"
    ]);
    expect(chain?.versions[1]?.events[0]?.fromPath).toBe("src/a.ts");
  });

  it("un cambio de cuerpo dice cuánto cambió la complejidad", () => {
    const chains = symbols(
      buildChains([
        step("1", [symbol("cargar", "h1", { complexity: 4 })]),
        step("2", [symbol("cargar", "h2", { complexity: 9 })])
      ])
    );

    const chain = chains[0];
    expect(chain?.versions[1]?.events.map((event) => event.type)).toEqual([
      "changed"
    ]);
    expect(chain?.versions[1]?.events[0]?.complexityDelta).toBe(5);
  });

  it("un símbolo que desaparece cierra su cadena", () => {
    const chains = symbols(
      buildChains([
        step("1", [symbol("cargar", "h1"), symbol("otra", "h2")]),
        step("2", [symbol("otra", "h2")])
      ])
    );

    const cargar = chains.find((chain) => chain.name === "cargar");
    expect(cargar?.versions).toHaveLength(2);
    expect(cargar?.versions[1]?.events.map((event) => event.type)).toEqual([
      "removed"
    ]);
  });

  it("un símbolo nuevo nace con su propia cadena", () => {
    const chains = symbols(
      buildChains([
        step("1", [symbol("cargar", "h1")]),
        step("2", [symbol("cargar", "h1"), symbol("nueva", "h2")])
      ])
    );

    expect(chains).toHaveLength(2);
    const nueva = chains.find((chain) => chain.name === "nueva");
    expect(nueva?.versions[0]?.events.map((event) => event.type)).toEqual([
      "created"
    ]);
  });

  it("un cambio de cuerpo con el mismo nombre se cuenta como cambio", () => {
    const chains = symbols(
      buildChains([
        step("1", [symbol("cargar", "h1")]),
        step("2", [symbol("cargar", "h2")])
      ])
    );

    expect(chains).toHaveLength(1);
    expect(chains[0]?.versions[1]?.events.map((event) => event.type)).toEqual([
      "changed"
    ]);
  });

  it("la cabeza de la cadena cambia con cada versión", () => {
    const chains = symbols(
      buildChains([
        step("1", [symbol("cargar", "h1")]),
        step("2", [symbol("cargar", "h2")])
      ])
    );

    const versions = chains[0]?.versions ?? [];
    expect(versions[0]?.head).not.toBe(versions[1]?.head);
    expect(versions[1]?.head).toMatch(/^[0-9a-f]{64}$/);
  });

  it("conserva el tipo del símbolo y lo repite en el calor", () => {
    const chains = buildChains([
      step("1", [symbol("Cargador", "h1", { kind: "class" })])
    ]);

    expect(symbols(chains)[0]?.kind).toBe("class");
    expect(summarizeChains(chains)[0]?.kind).toBe("class");
  });
});

describe("la consulta de cadenas", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  function temporaryRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-chains-"));
    roots.push(root);
    return root;
  }

  it("sin símbolo devuelve el calor y ninguna cadena", () => {
    const root = temporaryRoot();
    saveHistory(
      root,
      snapshot([symbol("cargar", "h1")], "src/a.ts", "c1"),
      new Date("2026-01-01T00:00:00.000Z")
    );

    const payload = chainsPayload(root, null);

    expect(payload.available).toBe(true);
    expect(payload.chains).toEqual([]);
    expect(payload.heat.map((entry) => entry.name)).toContain("cargar");
  });

  it("busca por el nombre antiguo y nunca devuelve ficheros o el proyecto", () => {
    const root = temporaryRoot();
    saveHistory(
      root,
      snapshot([symbol("cargar", "h1")], "src/a.ts", "c1"),
      new Date("2026-01-01T00:00:00.000Z")
    );
    saveHistory(
      root,
      snapshot([symbol("buscar", "h1")], "src/a.ts", "c2"),
      new Date("2026-01-02T00:00:00.000Z")
    );

    const oldName = chainsPayload(root, "cargar");
    expect(oldName.chains).toHaveLength(1);
    expect(oldName.chains[0]?.name).toBe("buscar");

    expect(chainsPayload(root, "proj").chains).toEqual([]);
  });

  it("respeta un límite por encima de veinte", () => {
    const root = temporaryRoot();
    const many = Array.from({ length: 25 }, (_, index) =>
      symbol(`s${String(index).padStart(2, "0")}`, `h${index}`)
    );
    saveHistory(
      root,
      snapshot(many, "src/a.ts", "many"),
      new Date("2026-01-01T00:00:00.000Z")
    );

    expect(chainsPayload(root, "s", 50).chains).toHaveLength(25);
    expect(chainsPayload(root, "s", 3).chains).toHaveLength(3);
  });
});

describe("el anidamiento de las cadenas", () => {
  it("cada nivel tiene su cadena: símbolo, fichero, carpeta y proyecto", () => {
    const chains = buildChains([
      step("1", [symbol("cargar", "h1")], "src/a.ts"),
      step("2", [symbol("cargar", "h1")], "src/a.ts")
    ]);

    const niveles = chains.map((chain) => chain.level);
    expect(niveles).toContain("symbol");
    expect(niveles).toContain("file");
    expect(niveles).toContain("folder");
    expect(niveles).toContain("project");
  });

  it("el cuerpo de la carpeta se compromete con el de sus ficheros", () => {
    const antes = buildChains([step("1", [symbol("cargar", "h1")], "src/a.ts")]);
    const despues = buildChains([
      step("1", [symbol("cargar", "h1")], "src/a.ts"),
      step("2", [symbol("cargar", "h2")], "src/a.ts")
    ]);

    const carpetaAntes = antes.find((chain) => chain.level === "folder");
    const carpetaDespues = despues.find(
      (chain) => chain.level === "folder" && chain.versions.length === 2
    );

    expect(carpetaAntes?.versions[0]?.bodyHash).not.toBe(
      carpetaDespues?.versions[1]?.bodyHash
    );
  });

  it("el proyecto se compromete con todo: su cabeza cambia si cambia una hoja", () => {
    const antes = buildChains([step("1", [symbol("cargar", "h1")], "src/a.ts")]);
    const despues = buildChains([
      step("1", [symbol("cargar", "h1")], "src/a.ts"),
      step("2", [symbol("cargar", "h2")], "src/a.ts")
    ]);

    const proyectoAntes = antes.find((chain) => chain.level === "project");
    const proyectoDespues = despues.find(
      (chain) => chain.level === "project" && chain.versions.length === 2
    );

    expect(proyectoAntes?.versions[0]?.bodyHash).not.toBe(
      proyectoDespues?.versions[1]?.bodyHash
    );
  });

  it("el fichero cambia cuando cambia un símbolo suyo", () => {
    const chains = buildChains([
      step("1", [symbol("cargar", "h1")], "src/a.ts"),
      step("2", [symbol("cargar", "h2")], "src/a.ts")
    ]);

    const fichero = chains.find(
      (chain) => chain.level === "file" && chain.versions.length === 2
    );
    expect(fichero?.versions[1]?.events.map((event) => event.type)).toEqual([
      "changed"
    ]);
  });
});

describe("la comprobación", () => {
  it("un snapshot que encaja con su cadena pasa la comprobación", () => {
    const steps = [step("1", [symbol("cargar", "h1")])];
    const chains = buildChains(steps);

    const result = verifyChains(chains, steps[0]?.snapshot as CcJson);

    expect(result.ok).toBe(true);
    expect(result.mismatches).toHaveLength(0);
    expect(result.checked).toBe(1);
    expect(result.entry).toBe("1");
  });

  it("un snapshot con un hash que no es el de la cadena no pasa", () => {
    const steps = [step("1", [symbol("cargar", "h1")])];
    const chains = buildChains(steps);

    const otro = snapshot([symbol("cargar", "otro-hash")]);
    const result = verifyChains(chains, otro);

    expect(result.ok).toBe(false);
    expect(result.mismatches[0]?.name).toBe("cargar");
  });
});
