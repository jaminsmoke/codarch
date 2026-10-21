import { describe, expect, it } from "vitest";
import {
  REPORT_SCHEMA_VERSION,
  parseReport
} from "../src/index";

/**
 * Un `report.json` de una versión anterior tiene que poder leerse: se
 * reconstruye con la versión actual y las secciones que le falten, marcadas
 * como no medidas.
 */

const reporteV1 = {
  schemaVersion: "1.0",
  base: { projectName: "Acme", checksum: "base", files: 3, folders: 1, edges: 2 },
  head: { projectName: "Acme", checksum: "head", files: 3, folders: 1, edges: 2 },
  summary: {
    addedFiles: 0,
    removedFiles: 0,
    changedFiles: 1,
    addedEdges: 0,
    removedEdges: 0,
    cyclicEdgesAdded: 0,
    cyclicEdgesRemoved: 0,
    introducedCycles: 0,
    fixedCycles: 0,
    hotspots: 0
  },
  hotspotMetric: "maxComplexity",
  rules: {
    configured: false,
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
  hotspots: []
};

describe("parseReport", () => {
  it("reconstruye un reporte de la versión anterior", () => {
    const report = parseReport(reporteV1);
    expect(report).not.toBeNull();
    if (!report) return;
    expect(report.schemaVersion).toBe(REPORT_SCHEMA_VERSION);
    // La sección de migración no se midió en la versión anterior: se dice.
    expect(report.migration).toBeNull();
    // El resto del reporte se conserva.
    expect(report.summary.changedFiles).toBe(1);
    expect(report.base.checksum).toBe("base");
  });

  it("acepta un reporte de la versión actual sin tocarlo", () => {
    const actual = {
      ...reporteV1,
      schemaVersion: REPORT_SCHEMA_VERSION,
      migration: {
        languages: { base: {}, head: {} },
        status: {
          base: { js: 1, rust: 0, bridge: 0, native: 0 },
          head: { js: 1, rust: 0, bridge: 0, native: 0 }
        },
        debt: { base: 0, head: 0, delta: 0 },
        crossings: { base: 0, head: 0, delta: 0 },
        bridgeFiles: { base: 0, head: 0, delta: 0 },
        files: { increased: [], decreased: [] },
        topDebt: []
      }
    };
    const report = parseReport(actual);
    expect(report?.schemaVersion).toBe(REPORT_SCHEMA_VERSION);
    expect(report?.migration).not.toBeNull();
  });

  it("rechaza lo que no es un reporte", () => {
    expect(parseReport(null)).toBeNull();
    expect(parseReport("texto")).toBeNull();
    expect(parseReport({ schemaVersion: "0.9" })).toBeNull();
    expect(parseReport({ ...reporteV1, summary: undefined })).toBeNull();
  });
});
