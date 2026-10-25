import { describe, expect, it } from "vitest";
import type { RuleViolation } from "@codarch/metrics/browser";
import { countBySource, sourceLabel, violationPath } from "../src/rules";

function violation(overrides: Partial<RuleViolation>): RuleViolation {
  return {
    key: "rule:src/a.ts",
    rule: "capas",
    type: "forbidden",
    severity: "warn",
    source: "config",
    message: "src/a.ts no puede depender de src/b.ts",
    files: ["src/a.ts", "src/b.ts"],
    ...overrides
  };
}

describe("sourceLabel", () => {
  it("nombra de dónde sale la regla", () => {
    expect(sourceLabel("config")).toBe("equipo");
    expect(sourceLabel("profile")).toBe("perfil");
    expect(sourceLabel("addon:vista-3d")).toBe("vista-3d");
  });
});

describe("violationPath", () => {
  it("prefiere el primer fichero de la violación", () => {
    expect(violationPath(violation({}))).toBe("src/a.ts");
  });

  it("cae a la arista cuando no hay ficheros", () => {
    const edge = { fromId: "a", toId: "b", from: "src/a.ts", to: "src/b.ts" };
    expect(violationPath(violation({ files: [], edge }))).toBe("src/a.ts");
  });

  it("cae al primer nodo del ciclo", () => {
    const cycle = { size: 2, nodes: [{ id: "a", path: "src/a.ts" }] };
    expect(violationPath(violation({ files: [], cycle }))).toBe("src/a.ts");
  });

  it("sin fichero, arista ni ciclo no hay ruta", () => {
    expect(violationPath(violation({ files: [] }))).toBeNull();
  });
});

describe("countBySource", () => {
  it("agrupa por origen y ordena de más a menos", () => {
    const counts = countBySource([
      violation({ source: "config" }),
      violation({ source: "profile" }),
      violation({ source: "config" }),
      violation({ source: "addon:vista-3d" })
    ]);

    expect(counts).toEqual([
      { source: "config", label: "equipo", count: 2 },
      { source: "profile", label: "perfil", count: 1 },
      { source: "addon:vista-3d", label: "vista-3d", count: 1 }
    ]);
  });

  it("sin violaciones no inventa orígenes", () => {
    expect(countBySource([])).toEqual([]);
  });

  it("es determinista con el mismo recuento", () => {
    const input = [
      violation({ source: "profile" }),
      violation({ source: "config" })
    ];
    expect(countBySource(input)).toEqual(countBySource(input));
    expect(countBySource(input).map((row) => row.label)).toEqual([
      "equipo",
      "perfil"
    ]);
  });
});
