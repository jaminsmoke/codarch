import { describe, expect, it } from "vitest";
import type { DiffReport } from "@codarch/metrics/browser";
import { REPORT_SCHEMA_VERSION } from "@codarch/versions";
import { reportHasChanges } from "../src/ChangesPanel";

/** Un reporte sin diferencias, con el tipo real para que el typecheck lo vigile. */
function emptyReport(): DiffReport {
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    base: { projectName: "x", checksum: "a", files: 0, folders: 0, edges: 0 },
    head: { projectName: "x", checksum: "a", files: 0, folders: 0, edges: 0 },
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
    symbols: null
  };
}

describe("reportHasChanges", () => {
  it("un reporte sin diferencias no tiene nada que enseñar", () => {
    expect(reportHasChanges(emptyReport())).toBe(false);
  });

  it("un fichero cambiado cuenta como cambio", () => {
    const report = emptyReport();
    report.summary.changedFiles = 1;
    expect(reportHasChanges(report)).toBe(true);
  });

  it("una arista nueva o un ciclo introducido cuentan como cambio", () => {
    const edge = emptyReport();
    edge.summary.addedEdges = 1;
    expect(reportHasChanges(edge)).toBe(true);

    const cycle = emptyReport();
    cycle.summary.introducedCycles = 1;
    expect(reportHasChanges(cycle)).toBe(true);
  });

  it("una regla existente cuenta como cambio aunque no haya ficheros tocados", () => {
    const report = emptyReport();
    report.rules.summary.existing = 2;
    expect(reportHasChanges(report)).toBe(true);
  });
});
