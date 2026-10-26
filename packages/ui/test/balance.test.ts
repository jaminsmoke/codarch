import { describe, expect, it } from "vitest";
import type { DiffReport, MigrationFileChange } from "@codarch/metrics/browser";
import { REPORT_SCHEMA_VERSION } from "@codarch/versions";
import { DEBT_ROWS, balanceSummary, debtBalance } from "../src/balance";

/** Un reporte sin nada: cada caso le pone lo suyo. */
function emptyReport(): DiffReport {
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
    hotspotMetric: "maxComplexity",
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

/** Un fichero de deuda, con lo mínimo que lee la fila. */
function debtFile(
  path: string,
  base: number | null,
  head: number | null
): MigrationFileChange {
  const delta = base === null || head === null ? null : head - base;
  return { id: `n:${path}`, path, language: "ts", status: "js", base, head, delta };
}

/** La sección de migración con lo que cambió, ya repartido por sentido. */
function withMigration(
  increased: MigrationFileChange[],
  decreased: MigrationFileChange[]
): DiffReport {
  const next = emptyReport();
  next.migration = {
    languages: { base: {}, head: {} },
    debt: { base: 1000, head: 1200, delta: 200 },
    crossings: { base: 1, head: 3, delta: 2 },
    bridgeFiles: { base: 1, head: 1, delta: 0 },
    status: {
      base: { js: 0, rust: 0, bridge: 0, native: 0 },
      head: { js: 0, rust: 0, bridge: 1, native: 2 }
    },
    files: { increased, decreased },
    topDebt: []
  };
  return next;
}

describe("el balance de deuda", () => {
  it("lleva las cifras del reporte y reparte subidas y bajadas", () => {
    const report = withMigration(
      [debtFile("src/a.ts", 10, 30)],
      [debtFile("src/b.ts", 40, 15)]
    );

    const balance = debtBalance(report);

    expect(balance.debt).toEqual({ base: 1000, head: 1200, crossings: 3, native: 2 });
    expect(balance.increased.map((file) => file.path)).toEqual(["src/a.ts"]);
    expect(balance.decreased.map((file) => file.path)).toEqual(["src/b.ts"]);
    expect(balance.rest).toBe(0);
    expect(balance.count).toBe(2);
  });

  it("cada fila trae su delta y el grupo su mayor movimiento", () => {
    const balance = debtBalance(
      withMigration(
        [debtFile("src/a.ts", 10, 40)],
        [debtFile("src/b.ts", 40, 15)]
      )
    );

    // 40 - 10 y 15 - 40: la barra se escala con el mayor, sin signo.
    expect(balance.increased[0]?.delta).toBe(30);
    expect(balance.decreased[0]?.delta).toBe(-25);
    expect(balance.peak).toBe(30);
  });

  it("escala los hotspots con su propio mayor crecimiento", () => {
    const report = withMigration([], []);
    report.hotspots = [
      { id: "n:src/a.ts", path: "src/a.ts", metric: "maxComplexity", base: 1, head: 41, delta: 40, change: "changed" },
      { id: "n:src/b.ts", path: "src/b.ts", metric: "maxComplexity", base: 1, head: 11, delta: 10, change: "changed" }
    ];

    const balance = debtBalance(report);

    // Cada grupo escala con lo suyo: la deuda no marca la barra del hotspot.
    expect(balance.hotspotPeak).toBe(40);
    expect(balance.peak).toBe(0);
  });

  it("corta por sentido y dice cuántos se quedan fuera", () => {
    const increased = Array.from({ length: DEBT_ROWS + 2 }, (_, index) =>
      debtFile(`src/sube${index}.ts`, 0, index + 1)
    );
    const balance = debtBalance(withMigration(increased, []));

    expect(balance.increased.length).toBe(DEBT_ROWS);
    expect(balance.rest).toBe(2);
    // Lo que cuenta es lo que se pinta, no lo que se mide.
    expect(balance.count).toBe(DEBT_ROWS);
  });

  it("sin lente de migración no inventa deuda: se queda con los hotspots", () => {
    const report = emptyReport();
    report.hotspots = [
      { id: "n:src/a.ts", path: "src/a.ts", metric: "maxComplexity", base: 4, head: 12, delta: 8, change: "changed" }
    ];

    const balance = debtBalance(report);

    expect(balance.debt).toBeNull();
    expect(balance.increased).toEqual([]);
    expect(balance.decreased).toEqual([]);
    expect(balance.count).toBe(1);
  });

  it("una lente vieja sin nativos cuenta cero, no deja el hueco", () => {
    const report = withMigration([], []);
    if (!report.migration) throw new Error("sin migración");
    report.migration.status.head = { js: 0, rust: 0, bridge: 0, native: 0 };

    expect(debtBalance(report).debt?.native).toBe(0);
  });
});

describe("lo que dice la cabecera del balance", () => {
  it("junta la deuda y los hotspots en una línea", () => {
    const report = withMigration([debtFile("src/a.ts", 10, 30)], []);
    report.hotspots = [
      { id: "n:src/a.ts", path: "src/a.ts", metric: "maxComplexity", base: 4, head: 12, delta: 8, change: "changed" }
    ];

    expect(balanceSummary(debtBalance(report))).toBe("deuda 1k → 1,2k · 1 hotspots");
  });

  it("no deja separadores sueltos cuando falta una mitad", () => {
    const onlyDebt = debtBalance(withMigration([debtFile("src/a.ts", 0, 1)], []));
    expect(balanceSummary(onlyDebt)).toBe("deuda 1k → 1,2k");

    const onlyHotspots = emptyReport();
    onlyHotspots.hotspots = [
      { id: "n:src/a.ts", path: "src/a.ts", metric: "rloc", base: 1, head: 9, delta: 8, change: "changed" }
    ];
    expect(balanceSummary(debtBalance(onlyHotspots))).toBe("1 hotspots");
  });
});
