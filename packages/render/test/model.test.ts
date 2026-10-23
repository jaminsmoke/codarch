import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCcJson } from "@codarch/schema";
import { buildRenderModel, RenderError, type RenderOptions } from "../src/index";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/render.cc.json", import.meta.url), "utf8")
) as unknown;

function model(options: RenderOptions = {}) {
  return buildRenderModel(parseCcJson(fixture), options);
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

  it("es determinista", () => {
    expect(model()).toEqual(model());
  });

  it("rechaza una métrica de área que no existe", () => {
    expect(() => model({ areaMetric: "no_existe" })).toThrow(RenderError);
  });
});
