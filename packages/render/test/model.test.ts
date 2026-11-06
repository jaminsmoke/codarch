import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createLintArtifact, readLintArtifact } from "@codarch/lint";
import { RISK_GAMMA } from "@codarch/metrics";
import { parseCcJson } from "@codarch/schema";
import { buildRenderModel, RenderError, type RenderOptions } from "../src/index";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/render.cc.json", import.meta.url), "utf8")
) as unknown;

function model(options: RenderOptions = {}) {
  return buildRenderModel(parseCcJson(fixture), options);
}

/** El fixture con una lente de duplicación: dos ficheros y un par literal. */
function withDuplication() {
  const copy = structuredClone(fixture) as {
    lenses: {
      metrics: { attributes: Record<string, Record<string, number>> };
      duplication?: unknown;
    };
  };
  const a = copy.lenses.metrics.attributes.a;
  const b = copy.lenses.metrics.attributes.b;
  const readme = copy.lenses.metrics.attributes.readme;
  if (a) a.duplicatedLines = 30;
  if (b) b.duplicatedLines = 20;
  // El análisis escribe la métrica en todos los ficheros, también en los que no
  // duplican: el mínimo de la escala es cero.
  if (readme) readme.duplicatedLines = 0;
  copy.lenses.duplication = {
    nodes: {
      a: { duplicatedLines: 30, repeatedLines: 4 },
      b: { duplicatedLines: 20, repeatedLines: 0 }
    },
    pairs: [
      { fromId: "a", toId: "b", lines: 20, similarity: 100, status: "copy" }
    ],
    summary: {
      pairs: 1,
      copies: 0,
      duplicatedLines: 50,
      repeatedLines: 4,
      ratio: 31
    }
  };
  return parseCcJson(copy);
}

/** Varios pares, con un extremo que el mapa no tiene y un empate a similitud. */
function withPairs() {
  const copy = structuredClone(fixture) as {
    lenses: { duplication?: unknown };
  };
  copy.lenses.duplication = {
    nodes: {
      a: { duplicatedLines: 40, repeatedLines: 0 },
      b: { duplicatedLines: 24, repeatedLines: 0 },
      readme: { duplicatedLines: 5, repeatedLines: 0 }
    },
    pairs: [
      { fromId: "b", toId: "readme", lines: 24, similarity: 60, status: "diverging" },
      { fromId: "a", toId: "readme", lines: 5, similarity: 100, status: "copy" },
      { fromId: "a", toId: "zzz", lines: 10, similarity: 100, status: "copy" },
      { fromId: "a", toId: "b", lines: 20, similarity: 100, status: "copy" }
    ],
    summary: {
      pairs: 4,
      copies: 3,
      duplicatedLines: 49,
      repeatedLines: 0,
      ratio: 31
    }
  };
  return parseCcJson(copy);
}

describe("buildRenderModel", () => {
  it("usa rloc como área y deja un mínimo visible a los ficheros sin métrica", () => {
    const result = model();
    const readme = result.files.find((file) => file.name === "README.md");
    const a = result.files.find((file) => file.name === "a.ts");

    expect(result.areaMetric).toBe("rloc");
    expect(a?.area).toBe(120);
    expect(a?.actualArea).toBe(120);
    expect(readme?.area).toBe(1);
    expect(readme?.actualArea).toBe(0);
    expect(result.totalArea).toBe(160);
    expect(result.warnings.join(" ")).toContain('sin "rloc"');
  });

  it("colapsa cadenas de carpetas de un solo hijo", () => {
    const result = model();
    const src = result.roots.find((node) => node.name === "src/only");

    expect(src?.kind).toBe("folder");
    expect(src?.path).toBe("src/only");
    expect(src?.children?.map((child) => child.name)).toEqual(["a.ts", "b.ts"]);
  });

  it("deduplica aristas y usa las marcadas como ciclo", () => {
    const result = model();

    expect(result.edges).toEqual([
      { from: 0, to: 1 },
      { from: 1, to: 0 }
    ]);
    expect(result.cycles).toEqual(result.edges);
    expect(result.hotspotCount).toBe(2);
  });

  it("no inventa un ciclo si el snapshot no lo marca", () => {
    const copy = structuredClone(fixture) as {
      lenses?: {
        dependency?: { leafEdges?: Array<Record<string, unknown>> };
      };
    };
    for (const edge of copy.lenses?.dependency?.leafEdges ?? []) {
      delete edge.isCyclic;
    }

    const result = buildRenderModel(parseCcJson(copy));
    expect(result.cycles).toEqual([]);
  });

  it("elige el fichero con más riesgo como selección inicial", () => {
    const result = model();
    const selected = result.files[result.defaultSelection ?? -1];

    expect(selected?.name).toBe("a.ts");
    expect(result.files.some((file) => file.risk >= 0.66)).toBe(true);
  });

  it("explica el riesgo con sus cuatro señales, y sin lint la cuarta vale cero", () => {
    const result = model();
    const file = result.files.find((entry) => entry.name === "a.ts");
    const parts = file?.riskParts;

    expect(parts).toBeDefined();
    expect(
      parts!.complexity.weight +
        parts!.churn.weight +
        parts!.size.weight +
        parts!.lint.weight
    ).toBeCloseTo(1);
    const raw =
      parts!.complexity.share +
      parts!.churn.share +
      parts!.size.share +
      parts!.lint.share;
    expect(file!.risk).toBeCloseTo(Math.pow(raw, RISK_GAMMA));
    expect(file!.lint).toBe(0);
  });

  it("lleva el lint del proyecto al riesgo de cada fichero", () => {
    const plain = model();
    const withLint = model({
      lint: createLintArtifact({
        tools: ["eslint"],
        files: [
          {
            path: "src/only/b.ts",
            messages: [
              { rule: "no-any", severity: "error", message: "un `any`" },
              { rule: "no-any", severity: "error", message: "otro `any`" },
              { rule: "no-any", severity: "error", message: "y otro" }
            ]
          }
        ]
      })
    });
    const b = withLint.files.find((entry) => entry.name === "b.ts");
    const before = plain.files.find((entry) => entry.name === "b.ts");

    expect(b?.lint).toBe(3);
    expect(before?.lint).toBe(0);
    expect(b?.riskParts.lint.value).toBe(3);
    expect(b!.risk).toBeGreaterThan(before!.risk);
  });

  it("un artefacto sin hallazgos ya cuenta: el lint pesa 20 % y a cero", () => {
    const plain = model();
    const withLint = model({
      lint: createLintArtifact({ tools: ["eslint"], files: [] })
    });
    const file = withLint.files.find((entry) => entry.name === "a.ts");
    const before = plain.files.find((entry) => entry.name === "a.ts");

    expect(file?.lint).toBe(0);
    expect(file?.riskParts.lint.weight).toBeCloseTo(0.2);
    expect(file?.riskParts.lint.share).toBe(0);
    expect(file!.risk).toBeLessThan(before!.risk);
  });

  it("la deuda de cada fichero sale de sus mensajes, no de sus cuentas", () => {
    const artifact = createLintArtifact({
      tools: ["eslint"],
      files: [
        {
          path: "src/only/b.ts",
          messages: [{ rule: "no-any", severity: "error", message: "un `any`" }]
        }
      ]
    });
    // Un artefacto de fuera con la cuenta declarada inflada: el mapa no la lee.
    const tampered = structuredClone(artifact);
    const entry = tampered.files["src/only/b.ts"];
    if (entry) entry.errors = 9;

    const result = model({ lint: tampered });
    expect(result.files.find((file) => file.name === "b.ts")?.lint).toBe(1);
  });

  it("pinta la deuda en la ruta canónica, no en la clave cruda", () => {
    const lint = readLintArtifact({
      schemaVersion: "1.2",
      meta: { checksum: "abc", tools: ["eslint"], systems: [] },
      files: {
        ".\\src\\only\\b.ts": {
          errors: 9,
          warnings: 9,
          messages: [{ rule: "no-any", severity: "error", message: "un any" }]
        }
      },
      summary: { files: 9, errors: 9, warnings: 9, messages: 9 }
    });

    expect(lint?.files["src/only/b.ts"]?.errors).toBe(1);
    const result = model({ lint: lint ?? undefined });
    expect(result.files.find((file) => file.name === "b.ts")?.lint).toBe(1);
    expect(result.files.find((file) => file.name === "a.ts")?.lint).toBe(0);
  });

  it("la lente del lint abre con su deuda y su escala es el máximo del mapa", () => {
    const result = model({
      color: "lint",
      lint: createLintArtifact({
        tools: ["eslint"],
        files: [
          {
            path: "src/only/b.ts",
            messages: [
              { rule: "no-any", severity: "error", message: "un `any`" },
              { rule: "no-any", severity: "warn", message: "otro" }
            ]
          }
        ]
      })
    });

    expect(result.initialLens).toBe("lint");
    expect(result.initialMetric).toBeNull();
    // Un error y un aviso: 1 + ¼.
    expect(result.lintMax).toBe(1.25);
    expect(result.files.find((file) => file.name === "a.ts")?.lint).toBe(0);
  });

  it("la lente del lint sin artefacto es un error, no un mapa limpio", () => {
    expect(() => model({ color: "lint" })).toThrow(RenderError);
  });

  it("calcula secciones estables ordenadas por área", () => {
    const result = model();

    expect(result.sections.map((section) => section.key)).toEqual(["src/only", "(raíz)"]);
    expect(result.sections[0]?.area).toBe(160);
    expect(result.files.find((file) => file.name === "a.ts")?.section).toBe(0);
  });

  it("respeta el título y la dirección de las métricas", () => {
    const result = model();
    const rloc = result.metrics.find((metric) => metric.key === "rloc");

    expect(rloc?.title).toBe("Líneas de código");
    expect(rloc?.direction).toBe(-1);
    expect(result.metrics.map((metric) => metric.key)).toContain("complexity");
  });

  it("renormaliza el riesgo cuando falta la señal de churn", () => {
    const copy = structuredClone(fixture) as {
      lenses?: {
        metrics?: { attributes?: Record<string, Record<string, number>> };
      };
    };
    for (const values of Object.values(copy.lenses?.metrics?.attributes ?? {})) {
      delete values.number_of_commits;
      delete values.number_of_authors;
      delete values.number_of_renames;
    }

    const result = buildRenderModel(parseCcJson(copy));
    expect(Math.max(...result.files.map((file) => file.risk))).toBeGreaterThan(
      0.9
    );
  });

  it("lleva la duplicación a cada fichero y a su color", () => {
    const result = buildRenderModel(withDuplication(), {
      color: "duplicatedLines"
    });
    const metric = result.metrics.find(
      (entry) => entry.key === "duplicatedLines"
    );

    expect(result.duplication.measured).toBe(true);
    expect(result.duplication.nodes.a?.duplicatedLines).toBe(30);
    expect(result.duplication.nodes.a?.repeatedLines).toBe(4);
    // El par se lee desde los dos lados y la ruta ya no lleva la raíz del mapa.
    expect(result.duplication.pairsByNode.a?.[0]).toEqual({
      path: "src/only/b.ts",
      lines: 20,
      similarity: 100,
      status: "copy"
    });
    expect(result.duplication.pairsByNode.b?.[0]?.path).toBe("src/only/a.ts");
    // La lista lleva los dos extremos con las rutas del mapa (M70).
    expect(result.duplication.list).toEqual([
      {
        from: "src/only/a.ts",
        to: "src/only/b.ts",
        lines: 20,
        similarity: 100,
        status: "copy"
      }
    ]);
    expect(result.duplication.pairs).toBe(1);
    expect(result.initialMetric).toBe("duplicatedLines");
    // La escala es la del mapa: mínimo y p95 de la métrica.
    expect(metric?.min).toBe(0);
    expect(metric?.max).toBe(20);
    expect(metric?.actualMax).toBe(30);
  });

  it("ordena los pares por similitud, líneas y rutas y cae el que no tiene dos extremos", () => {
    const result = buildRenderModel(withPairs());

    expect(
      result.duplication.list.map((pair) => `${pair.from}->${pair.to}`)
    ).toEqual([
      "src/only/a.ts->src/only/b.ts",
      "src/only/a.ts->README.md",
      "src/only/b.ts->README.md"
    ]);
    // El par con un extremo fuera del mapa no se cuenta: no se puede abrir.
    expect(result.duplication.pairs).toBe(3);
  });

  it("un snapshot sin la lente está sin medir, no a cero", () => {
    const result = model();
    expect(result.duplication.measured).toBe(false);
    expect(result.duplication.nodes).toEqual({});
  });

  it("es determinista", () => {
    expect(model()).toEqual(model());
  });

  it("rechaza una métrica de área que no existe", () => {
    expect(() => model({ areaMetric: "no_existe" })).toThrow(RenderError);
  });
});
