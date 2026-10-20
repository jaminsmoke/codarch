import { describe, expect, it } from "vitest";
import {
  emptyRuleReport,
  evaluateRules,
  parseRuleConfig,
  type RuleEdge,
  type RuleFile,
  type RuleInput
} from "../src/index";

function file(path: string, metrics: Record<string, number> = {}): RuleFile {
  return { id: path, path, metrics };
}

function edge(from: string, to: string): RuleEdge {
  return { fromId: from, toId: to, from, to };
}

function input(
  files: RuleFile[],
  edges: RuleEdge[] = [],
  cycles: RuleInput["cycles"] = []
): RuleInput {
  return { files, edges, cycles };
}

const layers = [
  { name: "domain", patterns: ["src/domain/**"] },
  { name: "infra", patterns: ["src/infra/**"] }
];

describe("evaluateRules", () => {
  it("marca como introducida una arista prohibida nueva", () => {
    const config = parseRuleConfig({
      version: 1,
      layers,
      rules: [
        {
          name: "domain-no-infra",
          type: "forbidden",
          from: "domain",
          to: "infra"
        }
      ]
    });
    const files = [file("src/domain/a.ts"), file("src/infra/b.ts")];
    const base = input(files);
    const head = input(files, [edge("src/domain/a.ts", "src/infra/b.ts")]);

    const report = evaluateRules(base, head, config);

    expect(report.configured).toBe(true);
    expect(report.summary.introduced).toBe(1);
    expect(report.summary.introducedErrors).toBe(1);
    expect(report.violations.introduced[0]).toMatchObject({
      rule: "domain-no-infra",
      type: "forbidden",
      severity: "error",
      files: ["src/domain/a.ts", "src/infra/b.ts"]
    });
    expect(report.violations.introduced[0]?.edge).toEqual({
      fromId: "src/domain/a.ts",
      toId: "src/infra/b.ts",
      from: "src/domain/a.ts",
      to: "src/infra/b.ts"
    });
  });

  it("distingue deuda existente y resuelta", () => {
    const config = parseRuleConfig({
      version: 1,
      layers,
      rules: [
        {
          name: "domain-no-infra",
          type: "forbidden",
          from: "domain",
          to: "infra"
        }
      ]
    });
    const files = [file("src/domain/a.ts"), file("src/infra/b.ts")];
    const violationEdge = edge("src/domain/a.ts", "src/infra/b.ts");

    const existing = evaluateRules(
      input(files, [violationEdge]),
      input(files, [violationEdge]),
      config
    );
    expect(existing.summary).toMatchObject({
      introduced: 0,
      existing: 1,
      resolved: 0
    });

    const resolved = evaluateRules(
      input(files, [violationEdge]),
      input(files),
      config
    );
    expect(resolved.summary).toMatchObject({
      introduced: 0,
      existing: 0,
      resolved: 1
    });
  });

  it("evalúa umbrales por fichero y detecta cruces nuevos", () => {
    const config = parseRuleConfig({
      version: 1,
      layers: [],
      rules: [
        {
          name: "complexity",
          type: "threshold",
          metric: "maxComplexity",
          max: 10,
          severity: "warn"
        }
      ]
    });
    const base = input([file("src/a.ts", { maxComplexity: 5 })]);
    const head = input([file("src/a.ts", { maxComplexity: 20 })]);
    const report = evaluateRules(base, head, config);

    expect(report.summary.introduced).toBe(1);
    expect(report.summary.introducedWarnings).toBe(1);
    expect(report.violations.introduced[0]).toMatchObject({
      type: "threshold",
      severity: "warn",
      metric: { name: "maxComplexity", value: 20, max: 10 }
    });
    expect(report.violations.introduced[0]?.message).toContain(
      "src/a.ts: maxComplexity = 20"
    );
  });

  it("evalúa ciclos y conserva el componente", () => {
    const config = parseRuleConfig({
      version: 1,
      layers: [],
      rules: [{ name: "cycles", type: "cycles", severity: "error" }]
    });
    const files = [file("src/a.ts"), file("src/b.ts")];
    const cycle = {
      size: 2,
      nodes: [
        { id: "src/a.ts", path: "src/a.ts" },
        { id: "src/b.ts", path: "src/b.ts" }
      ]
    };

    const report = evaluateRules(
      input(files, [], []),
      input(files, [], [cycle]),
      config
    );
    expect(report.summary.introduced).toBe(1);
    expect(report.violations.introduced[0]).toMatchObject({
      type: "cycles",
      cycle: { size: 2 }
    });
    expect(report.violations.introduced[0]?.message).toContain("2 ficheros");

    const existing = evaluateRules(
      input(files, [], [cycle]),
      input(files, [], [cycle]),
      config
    );
    expect(existing.summary).toMatchObject({ introduced: 0, existing: 1 });
  });

  it("usa la primera capa que coincide y ordena violaciones", () => {
    const config = parseRuleConfig({
      version: 1,
      layers: [
        { name: "domain", patterns: ["src/domain/**"] },
        { name: "infra", patterns: ["src/infra/**"] },
        { name: "all-src", patterns: ["src/**"] }
      ],
      rules: [
        {
          name: "domain-no-infra",
          type: "forbidden",
          from: "domain",
          to: "infra"
        }
      ]
    });
    const files = [
      file("src/domain/z.ts"),
      file("src/domain/a.ts"),
      file("src/infra/b.ts")
    ];
    const report = evaluateRules(
      input(files),
      input(files, [
        edge("src/domain/z.ts", "src/infra/b.ts"),
        edge("src/domain/a.ts", "src/infra/b.ts")
      ]),
      config
    );

    expect(report.violations.introduced.map((violation) => violation.key)).toEqual([
      "forbidden:domain-no-infra:src/domain/a.ts->src/infra/b.ts",
      "forbidden:domain-no-infra:src/domain/z.ts->src/infra/b.ts"
    ]);
  });

  it("sin configuración no hay reglas", () => {
    const report = emptyRuleReport();
    expect(report.configured).toBe(false);
    expect(report.summary.introduced).toBe(0);
    expect(report.violations.introduced).toEqual([]);
  });
});
