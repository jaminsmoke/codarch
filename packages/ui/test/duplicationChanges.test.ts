import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DiffReport } from "@codarch/metrics/browser";
import { REPORT_SCHEMA_VERSION } from "@codarch/versions";
import { DuplicationChangesSection } from "../src/changes/sections";

/** Un reporte sin nada más, para que la sección se lea sola. */
function report(duplication: DiffReport["duplication"]): DiffReport {
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
    totals: null,
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
    duplication
  };
}

function markup(duplication: DiffReport["duplication"]): string {
  return renderToStaticMarkup(
    createElement(DuplicationChangesSection, {
      report: report(duplication),
      onSelectPath: () => {}
    })
  );
}

const duplication: DiffReport["duplication"] = {
  base: { pairs: 1, copies: 0, duplicatedLines: 20, repeatedLines: 0 },
  head: { pairs: 2, copies: 1, duplicatedLines: 50, repeatedLines: 4 },
  lines: { base: 20, head: 50, delta: 30 },
  counts: { added: 1, removed: 0, diverging: 1 },
  added: [
    {
      from: "src/a.ts",
      to: "src/b.ts",
      kind: "added",
      lines: 12,
      similarity: 100,
      previousSimilarity: null,
      linesDelta: null
    }
  ],
  removed: [],
  diverging: [
    {
      from: "src/b.ts",
      to: "src/c.ts",
      kind: "diverging",
      lines: 30,
      similarity: 66,
      previousSimilarity: 90,
      linesDelta: 10
    }
  ]
};

describe("la duplicación del cambio", () => {
  it("enseña las líneas, los pares y los dos extremos de cada uno", () => {
    const text = markup(duplication);

    expect(text).toContain("Duplicación");
    // Las líneas ganadas, con su signo.
    expect(text).toContain("+30");
    expect(text).toContain("Pares que cambian");
    expect(text).toContain("src/a.ts");
    expect(text).toContain("src/b.ts");
    expect(text).toContain("nuevo · copia");
    expect(text).toContain("se separa · 90% → 66%");
    expect(text).toContain("30 líneas");
  });

  it("dice cuántos pares no caben en la lista", () => {
    const text = markup({
      ...duplication,
      counts: { added: 3, removed: 0, diverging: 1 }
    });

    expect(text).toContain("+2 más");
  });

  it("con la lente en un solo lado no compara y dice cuál falta", () => {
    const text = markup({
      ...duplication,
      base: null,
      lines: { base: null, head: 50, delta: null },
      counts: { added: 0, removed: 0, diverging: 0 },
      added: [],
      diverging: []
    });

    expect(text).toContain("sin comparación");
    expect(text).toContain("está en la base");
    expect(text).toContain("no en el head");
  });

  it("sin la lente dice que no hay nada medido", () => {
    const text = markup(null);
    expect(text).toContain("sin medir");
    expect(text).toContain("no trae la lente de duplicación");
  });
});
