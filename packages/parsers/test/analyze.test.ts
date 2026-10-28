import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CC_JSON_VERSION, getStats, parseCcJson } from "@codarch/schema";
import { analyzeRepository } from "../src/index";
import { analyzeFiles } from "../src/analyze-core";
import { MemoryFileSystem } from "../src/fs";
import { TypeScriptParser } from "../src/ts/parser";

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

  it("cuenta las variables del módulo en la lente de símbolos", () => {
    const result = analyzeRepository(fixture, { git: false });
    const summary = result.snapshot.lenses?.symbols?.summary;
    if (!summary) throw new Error("falta la lente de símbolos");

    expect(summary.variables).toBeGreaterThan(0);
    expect(summary.symbols).toBe(
      summary.functions +
        summary.classes +
        summary.interfaces +
        summary.types +
        summary.enums +
        summary.variables
    );
    expect(
      Object.values(result.snapshot.lenses?.symbols?.nodes ?? {}).flat()
    ).toContainEqual(
      expect.objectContaining({
        name: "b",
        kind: "variable",
        line: 1
      })
    );
  });

  it("guarda la estructura que no es símbolo y es determinista", () => {
    const first = analyzeRepository(fixture, { git: false });
    const second = analyzeRepository(fixture, { git: false });
    const structure = first.snapshot.lenses?.structure;
    if (!structure) throw new Error("falta la lente de estructura");

    expect(structure.nodes).toEqual(second.snapshot.lenses?.structure?.nodes);
    expect(Object.values(structure.nodes).length).toBeGreaterThan(0);
    expect(Object.values(structure.nodes).flatMap((node) => node.imports)).toContainEqual(
      expect.objectContaining({
        source: "./lib/a.js",
        names: ["a"]
      })
    );
    expect(Object.values(structure.nodes).flatMap((node) => node.exports)).toContainEqual(
      expect.objectContaining({
        name: "a",
        kind: "declaration"
      })
    );
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

describe("los imports que no son aristas", () => {
  /**
   * Un `?raw` devuelve el texto de un fichero; el módulo no se ejecuta, así que
   * no hay arista ni puede faltar: es la web del proyecto importando su propio
   * markdown, que antes salía como import roto (ADR 0090).
   */
  it("una lectura `?raw` no cuenta como import sin resolver", () => {
    const files = new MemoryFileSystem([
      [
        "/src/guia.ts",
        [
          'import normas from "../docs/normas.md?raw";',
          'import { suma } from "./suma";',
          "",
          "export const texto = normas;",
          "export const total = suma(1, 2);",
          ""
        ].join("\n")
      ],
      ["/src/suma.ts", "export const suma = (a: number, b: number) => a + b;\n"],
      ["/docs/normas.md", "# Normas\n"]
    ]);

    const result = analyzeFiles({
      fileSystem: files,
      root: "/",
      projectName: "proyecto",
      parsers: [new TypeScriptParser()]
    });

    expect(result.files).toBe(2);
    expect(result.edges).toBe(1);
    expect(result.unresolved).toEqual([]);
    expect(result.externalImports).toBe(0);
    expect(result.warnings.join("\n")).not.toContain("sin resolver");

    // Y sigue siendo determinista: el mismo código, el mismo documento.
    const again = analyzeFiles({
      fileSystem: files,
      root: "/",
      projectName: "proyecto",
      parsers: [new TypeScriptParser()]
    });
    expect(again.snapshot).toEqual(result.snapshot);
  });
});
