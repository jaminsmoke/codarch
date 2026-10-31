import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { REPORT_SCHEMA_VERSION, type DiffReport } from "@codarch/metrics";
import { afterEach, describe, expect, it } from "vitest";
import {
  preferredReport,
  readStoredReport,
  reportFilePath,
  writeStoredReport
} from "../src/report-store";

const tempRoots: string[] = [];

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-report-"));
  tempRoots.push(root);
  return root;
}

/**
 * Un reporte válido con la marca que se le pase.
 *
 * Lo que se prueba es dónde vive cada reporte y cuál manda, no el cálculo: el
 * lector de `@codarch/metrics` solo tiene que reconocerlo.
 */
function report(mark: string): DiffReport {
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    base: {},
    head: {},
    summary: {},
    hotspotMetric: mark,
    rules: {
      configured: false,
      summary: {},
      violations: { introduced: [], existing: [], resolved: [] }
    },
    cycles: { introduced: [], fixed: [] },
    files: { added: [], changed: [], removed: [] },
    hotspots: []
  } as unknown as DiffReport;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("los reportes guardados", () => {
  it("declara un fichero por tipo, dentro de .codarch", () => {
    const root = tempRoot();
    expect(reportFilePath(root, "worktree")).toBe(
      path.join(root, ".codarch", "head-report.json")
    );
    expect(reportFilePath(root, "artifact")).toBe(
      path.join(root, ".codarch", "report.json")
    );
  });

  it("el del árbol de trabajo manda sobre el guardado", () => {
    const root = tempRoot();
    writeStoredReport(root, "artifact", report("guardado"));
    writeStoredReport(root, "worktree", report("trabajo"));

    expect(preferredReport(root)?.kind).toBe("worktree");
    expect(preferredReport(root)?.report.hotspotMetric).toBe("trabajo");
    // Los dos siguen ahí: la precedencia es al leer, no al escribir.
    expect(readStoredReport(root, "artifact")?.report.hotspotMetric).toBe(
      "guardado"
    );
  });

  it("sin reporte del árbol de trabajo, el guardado es el que se enseña", () => {
    const root = tempRoot();
    writeStoredReport(root, "artifact", report("guardado"));
    expect(preferredReport(root)?.kind).toBe("artifact");
  });

  it("sin ninguno de los dos, no hay reporte", () => {
    expect(preferredReport(tempRoot())).toBeNull();
  });

  it("un fichero que no es un reporte es como no tenerlo", () => {
    const root = tempRoot();
    fs.mkdirSync(path.join(root, ".codarch"), { recursive: true });
    fs.writeFileSync(
      path.join(root, ".codarch", "head-report.json"),
      JSON.stringify({ source: "otra cosa" })
    );
    expect(readStoredReport(root, "worktree")).toBeNull();
    expect(preferredReport(root)).toBeNull();
  });

  it("escribe el reporte con una pasada determinista", () => {
    const root = tempRoot();
    const file = writeStoredReport(root, "worktree", report("trabajo"));
    const first = fs.readFileSync(file, "utf8");
    writeStoredReport(root, "worktree", report("trabajo"));
    expect(fs.readFileSync(file, "utf8")).toBe(first);
    expect(first.endsWith("\n")).toBe(true);
  });
});
