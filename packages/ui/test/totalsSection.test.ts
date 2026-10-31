import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DiffReport } from "@codarch/metrics/browser";
import { REPORT_SCHEMA_VERSION } from "@codarch/versions";
import type { RenderModel } from "@codarch/render/browser";
import { TotalsSection } from "../src/changes/TotalsSection";

/** Un reporte sin diferencias, con el tipo real para que el typecheck lo vigile. */
function report(totals: DiffReport["totals"]): DiffReport {
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    base: { projectName: "x", checksum: "a", files: 0, folders: 0, edges: 0 },
    head: { projectName: "x", checksum: "b", files: 0, folders: 0, edges: 0 },
    summary: {
      addedFiles: 0,
      removedFiles: 0,
      changedFiles: 0,
      addedEdges: 0,
      removedEdges: 0,
      cyclicEdgesAdded: 0,
      cyclicEdgesRemoved: 0,
      introducedCycles: 0,
      fixedCycles: 0,
      hotspots: 0,
      addedRloc: 0,
      removedRloc: 0,
      changedRloc: 0
    },
    totals,
    hotspotMetric: null,
    rules: {
      configured: false,
      profile: null,
      summary: {
        layers: 0,
        rules: 0,
        introduced: 0,
        existing: 0,
        resolved: 0,
        introducedErrors: 0,
        introducedWarnings: 0
      },
      violations: { introduced: [], existing: [], resolved: [] }
    },
    files: { added: [], removed: [], changed: [] },
    edges: { added: [], removed: [], cyclicAdded: [], cyclicRemoved: [] },
    cycles: { introduced: [], fixed: [] },
    hotspots: [],
    migration: null,
    symbols: null,
    duplication: null
  };
}

function model(): RenderModel {
  return {
    metrics: [
      { key: "rloc", title: "Líneas de código", direction: -1 },
      { key: "fanIn", title: "Entradas", direction: 1 }
    ]
  } as unknown as RenderModel;
}

function markup(totals: DiffReport["totals"]): string {
  return renderToStaticMarkup(
    createElement(TotalsSection, { report: report(totals), model: model() })
  );
}

describe("la tabla de totales de Cambios (ADR 0071)", () => {
  it("pinta base, head y delta de cada métrica", () => {
    const html = markup({
      metrics: {
        rloc: { base: 15, head: 16, delta: 1 }
      }
    });

    expect(html).toContain("Totales");
    expect(html).toContain("Líneas de código");
    expect(html).toContain("15");
    expect(html).toContain("16");
    expect(html).toContain("+1");
  });

  it("colorea el delta según la dirección: subir rloc empeora", () => {
    const html = markup({
      metrics: { rloc: { base: 15, head: 16, delta: 1 } }
    });

    expect(html).toContain("is-worse");
  });

  it("una métrica donde subir es mejor se pinta como mejora", () => {
    const html = markup({
      metrics: { fanIn: { base: 2, head: 5, delta: 3 } }
    });

    expect(html).toContain("is-better");
  });

  it("un delta sin dirección no se pinta", () => {
    const html = renderToStaticMarkup(
      createElement(TotalsSection, {
        report: report({ metrics: { rloc: { base: 1, head: 2, delta: 1 } } }),
        model: { metrics: [] } as unknown as RenderModel
      })
    );

    expect(html).not.toContain("is-worse");
    expect(html).not.toContain("is-better");
  });

  it("un reporte sin totales no pinta la tabla", () => {
    expect(markup(null)).toBe("");
  });
});
