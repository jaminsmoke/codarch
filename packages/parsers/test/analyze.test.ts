import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CC_JSON_VERSION, getStats, parseCcJson } from "@codarch/schema";
import { analyzeRepository } from "../src/index";

const fixture = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "repo"
);

describe("analyzeRepository", () => {
  it("produce un snapshot cc.json válido y determinista", () => {
    const first = analyzeRepository(fixture, { git: false });
    const second = analyzeRepository(fixture, { git: false });

    expect(first.snapshot.meta.projectName).toBe("fixture-repo");
    expect(first.snapshot.meta.apiVersion).toBe(CC_JSON_VERSION);
    expect(first.snapshot.meta.checksum).toMatch(/^[0-9a-f]{32}$/);
    expect(second.snapshot).toEqual(first.snapshot);
    expect(second.snapshot.meta.checksum).toBe(first.snapshot.meta.checksum);

    const cc = parseCcJson(first.snapshot);
    const stats = getStats(cc);
    expect(stats.files).toBe(15);
    expect(stats.folders).toBe(8);
    expect(stats.edges).toBe(13);
    expect(stats.orphanMetricNodes).toBe(0);
  });

  it("cuenta ficheros, carpetas, aristas y ciclos", () => {
    const result = analyzeRepository(fixture, { git: false });
    expect(result.files).toBe(15);
    expect(result.folders).toBe(7);
    expect(result.edges).toBe(13);
    expect(result.cycles).toEqual([
      ["src/cycle/a.ts", "src/cycle/b.ts"],
      ["src/index.ts"]
    ]);
    expect(result.unresolvedImports).toBe(2);
    expect(result.externalImports).toBe(2);
    expect(result.builtinImports).toBe(0);
    expect(result.typeOnlyImports).toBe(1);
  });

  it("incluye métricas de parser y de grafo en todos los ficheros", () => {
    const result = analyzeRepository(fixture, { git: false });
    const attributes = result.snapshot.lenses?.metrics?.attributes ?? {};
    const values = Object.values(attributes);

    expect(values).toHaveLength(15);
    for (const metrics of values) {
      expect(metrics).toMatchObject({
        loc: expect.any(Number),
        rloc: expect.any(Number),
        functions: expect.any(Number),
        maxComplexity: expect.any(Number),
        maxFunctionLength: expect.any(Number),
        fanIn: expect.any(Number),
        fanOut: expect.any(Number),
        inCycle: expect.any(Number),
        cycleSize: expect.any(Number),
        dependencyLevel: expect.any(Number),
        migrationDebt: expect.any(Number),
        ffiCrossings: expect.any(Number)
      });
    }

    expect(result.metricNames).toHaveLength(17);
  });

  it("marca el self-loop y las aristas type-only", () => {
    const result = analyzeRepository(fixture, { git: false });
    const edges = result.snapshot.lenses?.dependency?.edges ?? [];
    const selfLoop = edges.find(
      (edge) => edge.fromId === edge.toId && edge.isCyclic
    );

    expect(selfLoop).toBeDefined();
    expect(edges.some((edge) => edge.attributes?.typeOnly === 1)).toBe(true);
    expect(edges.filter((edge) => edge.isCyclic)).toHaveLength(3);
  });

  it("clasifica externos y no resueltos sin crear aristas", () => {
    const result = analyzeRepository(fixture, { git: false });
    expect(result.unresolved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: "src/index.ts", specifier: "./missing" }),
        expect.objectContaining({
          file: "src/unresolved.ts",
          specifier: "./does-not-exist"
        })
      ])
    );
    expect(result.warnings.join("\n")).toContain("imports sin resolver");
  });
});
