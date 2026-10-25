import { describe, expect, it } from "vitest";
import type { DiffReport, RuleViolation } from "@codarch/metrics/browser";
import type { CcMigrationLens, CcSymbol } from "@codarch/schema/browser";
import {
  countViolations,
  ffiEdgesForFile,
  symbolSummary,
  violationsForPath
} from "../src/lenses";

function violation(overrides: Partial<RuleViolation>): RuleViolation {
  return {
    key: "rule:src/a.ts",
    rule: "capa",
    type: "forbidden",
    severity: "warn",
    source: "config",
    message: "src/a.ts no puede depender de src/b.ts",
    files: ["src/a.ts"],
    ...overrides
  };
}

function report(
  introduced: RuleViolation[],
  existing: RuleViolation[] = []
): DiffReport {
  return {
    rules: { violations: { introduced, existing } }
  } as unknown as DiffReport;
}

describe("violationsForPath", () => {
  it("trae las reglas que tocan la ruta, con las nuevas primero", () => {
    const rows = violationsForPath(
      report(
        [violation({ key: "nueva", rule: "nueva", files: ["src/a.ts", "src/b.ts"] })],
        [violation({ key: "vieja", rule: "vieja" })]
      ),
      "src/a.ts"
    );

    expect(rows.map((row) => row.violation.key)).toEqual(["nueva", "vieja"]);
    expect(rows[0]?.status).toBe("introduced");
    expect(rows[1]?.status).toBe("existing");
  });

  it("implica a los dos extremos de una arista prohibida", () => {
    const rows = violationsForPath(
      report([
        violation({
          files: ["src/a.ts", "src/b.ts"],
          edge: { fromId: "a", toId: "b", from: "src/a.ts", to: "src/b.ts" }
        })
      ]),
      "src/b.ts"
    );

    expect(rows).toHaveLength(1);
  });

  it("no confunde rutas que solo comparten prefijo", () => {
    expect(
      violationsForPath(report([violation({ files: ["src/ab.ts"] })]), "src/a.ts")
    ).toEqual([]);
  });

  it("entiende separadores de Windows y el ./ del principio", () => {
    const rows = violationsForPath(
      report([violation({ files: [".\\src\\a.ts"] })]),
      "src/a.ts"
    );

    expect(rows).toHaveLength(1);
  });

  it("ordena por severidad dentro del mismo estado", () => {
    const rows = violationsForPath(
      report([
        violation({ key: "info", rule: "info", severity: "info" }),
        violation({ key: "error", rule: "error", severity: "error" })
      ]),
      "src/a.ts"
    );

    expect(rows.map((row) => row.violation.key)).toEqual(["error", "info"]);
  });

  it("sin reporte no hay reglas que enseñar", () => {
    expect(violationsForPath(null, "src/a.ts")).toEqual([]);
  });
});

describe("countViolations", () => {
  it("cuenta nuevas y existentes", () => {
    const rows = violationsForPath(
      report(
        [violation({ key: "nueva" })],
        [violation({ key: "vieja" }), violation({ key: "otra", rule: "otra" })]
      ),
      "src/a.ts"
    );

    expect(countViolations(rows)).toEqual({ introduced: 1, existing: 2 });
  });
});

describe("ffiEdgesForFile", () => {
  const migration = {
    nodes: {},
    summary: {},
    edges: [
      { fromId: "a", toId: "b", kind: "wasm" },
      { fromId: "c", toId: "a", kind: "native" },
      { fromId: "x", toId: "y", kind: "wasm" }
    ]
  } as unknown as CcMigrationLens;

  const files = [
    { nodeId: "a", path: "src/a.ts" },
    { nodeId: "b", path: "src/b.ts" },
    { nodeId: "c", path: "src/c.ts" }
  ];

  it("traduce los extremos a rutas y dice la dirección", () => {
    expect(ffiEdgesForFile(migration, "a", files)).toEqual([
      { kind: "wasm", direction: "out", path: "src/b.ts" },
      { kind: "native", direction: "in", path: "src/c.ts" }
    ]);
  });

  it("ignora las aristas de otros ficheros", () => {
    expect(ffiEdgesForFile(migration, "x", files)).toEqual([]);
  });

  it("sin lente o sin nodo no hay aristas", () => {
    expect(ffiEdgesForFile(null, "a", files)).toEqual([]);
    expect(ffiEdgesForFile(migration, null, files)).toEqual([]);
  });
});

describe("symbolSummary", () => {
  const symbols: CcSymbol[] = [
    { name: "quieta", kind: "function", line: 1, complexity: 2 },
    { name: "compleja", kind: "function", line: 9, complexity: 18 },
    { name: "Tipo", kind: "type", line: 20 }
  ];

  it("cuenta funciones y elige la más compleja", () => {
    const summary = symbolSummary(symbols);

    expect(summary.count).toBe(3);
    expect(summary.functions).toBe(2);
    expect(summary.mostComplex?.name).toBe("compleja");
  });

  it("sin símbolos no inventa uno", () => {
    expect(symbolSummary([])).toEqual({
      count: 0,
      functions: 0,
      mostComplex: null
    });
  });
});
