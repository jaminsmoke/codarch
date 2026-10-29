import { describe, expect, it } from "vitest";
import type { CcJson, CcSymbol } from "@codarch/schema";
import type { IndexedSnapshot } from "../src/diff";
import { buildSymbolReport } from "../src/symbol-diff";

/** Un side del informe, ya indexado como lo deja el diff. */
function snapshot(
  entries: Array<[id: string, path: string, symbols: CcSymbol[]]>
): IndexedSnapshot {
  const paths = new Map<string, string>();
  const nodes: string[] = [];
  const symbolNodes: Record<string, CcSymbol[]> = {};

  for (const [id, path, symbols] of entries) {
    paths.set(id, path);
    nodes.push(id);
    symbolNodes[id] = symbols;
  }

  return {
    cc: {
      meta: { apiVersion: "2.1" },
      files: [],
      lenses: { symbols: { nodes: symbolNodes } }
    } as unknown as CcJson,
    paths,
    nodes,
    metrics: {},
    edges: new Map()
  };
}

function fn(name: string, line: number, hash: string, complexity = 1): CcSymbol {
  return { name, kind: "function", line, lines: 4, complexity, hash } as CcSymbol;
}

describe("el informe de símbolos", () => {
  it("cuenta cada estado y señala el fichero con más cambios", () => {
    const base = snapshot([
      ["a", "src/a.ts", [fn("parse", 1, "h1"), fn("old", 10, "h2")]],
      ["gone", "src/gone.ts", [fn("bye", 1, "g1")]]
    ]);
    const head = snapshot([
      ["a", "src/a.ts", [fn("parse", 1, "h1b", 5), fn("fresh", 20, "h3")]],
      ["b", "src/b.ts", [fn("same", 1, "s1")]]
    ]);

    const report = buildSymbolReport(base, head, 10);

    expect(report?.summary).toEqual({
      added: 2,
      removed: 2,
      changed: 1,
      topFile: { path: "src/a.ts", changed: 3 }
    });
    // Más cambios primero; a igualdad, por ruta.
    expect(report?.files.map((file) => file.path)).toEqual([
      "src/a.ts",
      "src/b.ts",
      "src/gone.ts"
    ]);
  });

  it("deja de pintar ficheros cuando se agota el presupuesto de cambios", () => {
    const many = (prefix: string, count: number): CcSymbol[] =>
      Array.from({ length: count }, (_, index) => fn(`${prefix}${index}`, index + 1, `${prefix}${index}`));

    const base = snapshot([["empty", "src/empty.ts", []]]);
    const head = snapshot(
      ["a", "b", "c", "d"].map((id) => [id, `src/${id}.ts`, many(id, 800)])
    );

    const report = buildSymbolReport(base, head, 10);

    // El resumen cuenta los 3200; el detalle se corta al pasar de 2000.
    expect(report?.summary.added).toBe(3200);
    expect(report?.summary.topFile).toEqual({ path: "src/a.ts", changed: 800 });
    expect(report?.files).toHaveLength(3);
  });

  it("no inventa un informe si ningún lado trae la lente", () => {
    const bare: IndexedSnapshot = {
      cc: { meta: { apiVersion: "2.1" }, files: [] } as unknown as CcJson,
      paths: new Map(),
      nodes: [],
      metrics: {},
      edges: new Map()
    };

    expect(buildSymbolReport(bare, bare, 10)).toBeNull();
  });
});
