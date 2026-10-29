import { describe, expect, it } from "vitest";
import type { RuleViolation } from "@codarch/metrics/browser";
import { countBySource, ruleRowDetails, sourceLabel, violationPath } from "../src/rules";

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

describe("ruleRowDetails", () => {
  const edge = { fromId: "a", toId: "b", from: "src/a.ts", to: "src/b.ts" };
  const metric = { name: "maxComplexity", value: 24, max: 10 };
  const cycle = {
    size: 2,
    nodes: [
      { id: "a", path: "src/a.ts" },
      { id: "b", path: "src/b.ts" }
    ]
  };

  it("enseña la arista solo si el mensaje no la cuenta", () => {
    expect(
      ruleRowDetails(violation({ message: "demasiadas capas", edge })).edge
    ).toEqual(edge);
    expect(
      ruleRowDetails(
        violation({ message: "src/a.ts no debe usar src/b.ts", edge })
      ).edge
    ).toBeNull();
  });

  it("enseña la métrica solo si el mensaje no la nombra", () => {
    expect(
      ruleRowDetails(violation({ message: "demasiado grande", metric })).metric
    ).toEqual(metric);
    expect(
      ruleRowDetails(
        violation({ message: "maxComplexity por encima del límite", metric })
      ).metric
    ).toBeNull();
  });

  it("enseña el ciclo solo si el mensaje no lo cuenta", () => {
    expect(ruleRowDetails(violation({ message: "hay un ciclo", cycle })).cycle).toEqual(
      cycle
    );
    expect(
      ruleRowDetails(violation({ message: "src/a.ts entra en un ciclo", cycle }))
        .cycle
    ).toBeNull();
  });

  it("sin ficheros ni ciclo, el tooltip lo dice", () => {
    expect(ruleRowDetails(violation({ files: [] })).title).toBe("Sin ruta");
    expect(ruleRowDetails(violation({ files: [], cycle })).title).toBe(
      "src/a.ts → src/b.ts"
    );
    expect(ruleRowDetails(violation({})).title).toBe("src/a.ts, src/b.ts");
  });

  it("dentro del fichero, la fila lleva al otro extremo y quita el prefijo", () => {
    const details = ruleRowDetails(
      violation({ message: "src/a.ts: no puede depender de src/b.ts" }),
      "src/a.ts"
    );

    expect(details.path).toBe("src/b.ts");
    expect(details.message).toBe("no puede depender de src/b.ts");
  });

  it("si el otro extremo no está en los ficheros, cae a la ruta normal", () => {
    const details = ruleRowDetails(
      violation({ message: "otra cosa" }),
      "src/z.ts"
    );

    expect(details.path).toBe("src/a.ts");
    expect(details.message).toBe("otra cosa");
  });
});
