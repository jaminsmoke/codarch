import { describe, expect, it } from "vitest";
import type { CcStats } from "@codarch/schema/browser";
import {
  areaOptionsFor,
  colorOptionsFor,
  metricOptionsFor,
  metricTitles,
  type ColorSources
} from "../src/app/selectors";

/** Unas estadísticas con las métricas que se digan. */
function stats(...coverage: string[]): CcStats {
  return {
    files: 3,
    folders: 1,
    maxDepth: 2,
    lenses: ["metrics"],
    metricNames: coverage.length,
    metricCoverage: coverage.map((name) => ({ name, files: 3 })),
    edges: 0,
    leafEdges: 0,
    orphanMetricNodes: 0
  };
}

const area = [
  { value: "rloc", label: "Líneas de código" },
  { value: "loc", label: "Líneas" }
];

function sources(extra: Partial<ColorSources> = {}): ColorSources {
  return {
    map: "code",
    lint: false,
    churn: false,
    migration: false,
    area,
    ...extra
  };
}

describe("las métricas del selector de área", () => {
  it("pone primero las preferidas, como la tabla del inspector", () => {
    expect(metricOptionsFor(stats("fanIn", "loc", "rloc"))).toEqual([
      "rloc",
      "loc",
      "fanIn"
    ]);
  });

  it("sin snapshot no hay opciones, ni inventadas ni vacías de relleno", () => {
    expect(metricOptionsFor(null)).toEqual([]);
  });

  it("el título es el del snapshot y, si no lo trae, la clave", () => {
    const title = metricTitles({
      rloc: { title: "Líneas de código" },
      loc: {}
    });

    expect(title("rloc")).toBe("Líneas de código");
    expect(title("loc")).toBe("loc");
    expect(title("imposible")).toBe("imposible");
  });

  it("el selector de área lleva una opción por métrica con su título", () => {
    expect(areaOptionsFor(["rloc", "loc"], (key) => key.toUpperCase())).toEqual([
      { value: "rloc", label: "RLOC" },
      { value: "loc", label: "LOC" }
    ]);
  });
});

describe("el selector de color", () => {
  it("ofrece riesgo y estructura aunque el snapshot no traiga nada más", () => {
    expect(colorOptionsFor(sources()).map((option) => option.value)).toEqual([
      "risk",
      "structure",
      "rloc",
      "loc"
    ]);
  });

  it("añade el lint solo cuando hay artefacto que pintar", () => {
    expect(
      colorOptionsFor(sources({ lint: true })).map((option) => option.value)
    ).toContain("lint");
    expect(
      colorOptionsFor(sources({ lint: false })).map((option) => option.value)
    ).not.toContain("lint");
  });

  it("añade el calor y la migración cuando el snapshot los trae", () => {
    const values = colorOptionsFor(
      sources({ churn: true, migration: true })
    ).map((option) => option.value);

    expect(values).toEqual([
      "risk",
      "structure",
      "churn",
      "status",
      "rloc",
      "loc"
    ]);
  });

  it("el resto se pinta por tipo, sin riesgo ni migración", () => {
    expect(
      colorOptionsFor(sources({ map: "rest", lint: true, migration: true }))
    ).toEqual([{ value: "kind", label: "Tipo" }, ...area]);
  });
});
