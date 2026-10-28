import { describe, expect, it } from "vitest";
import type { CcJson, CcStats } from "@codarch/schema/browser";
import {
  keepArea,
  keepColor,
  planSnapshotView
} from "../src/app/snapshotView";

/** Unas estadísticas con las métricas que se digan, en el orden dado. */
function stats(...coverage: string[]): CcStats {
  return {
    files: 3,
    folders: 1,
    maxDepth: 2,
    lenses: ["metrics", "migration"],
    metricNames: coverage.length,
    metricCoverage: coverage.map((name) => ({ name, files: 3 })),
    edges: 0,
    leafEdges: 0,
    orphanMetricNodes: 0
  };
}

/** Un snapshot con lente de migración, o sin ella. */
function snapshot(withMigration: boolean): CcJson {
  return {
    lenses: withMigration
      ? {
          migration: {
            nodes: {},
            edges: [],
            summary: {
              languages: {},
              status: { js: 0, rust: 0, bridge: 0, native: 0 },
              ffiEdges: 0,
              bridgeFiles: 0
            }
          }
        }
      : {}
  } as unknown as CcJson;
}

describe("planSnapshotView", () => {
  it("abre por la deuda de migración cuando el snapshot la trae", () => {
    const plan = planSnapshotView(
      snapshot(true),
      stats("rloc", "migrationDebt"),
      null
    );

    expect(plan).toEqual({ areaMetric: "rloc", colorMode: "migrationDebt" });
  });

  it("sin migración abre por el riesgo y usa rloc como área", () => {
    const plan = planSnapshotView(snapshot(false), stats("rloc"), null);

    expect(plan).toEqual({ areaMetric: "rloc", colorMode: "risk" });
  });

  it("sin rloc cae a la métrica de más cobertura", () => {
    const plan = planSnapshotView(snapshot(false), stats("loc", "imports"), null);

    expect(plan.areaMetric).toBe("loc");
  });

  it("respeta las preferencias que existen en este snapshot", () => {
    const plan = planSnapshotView(snapshot(true), stats("rloc", "fanIn"), {
      areaMetric: "fanIn",
      colorMode: "rloc",
      showLabels: true
    });

    expect(plan).toEqual({ areaMetric: "fanIn", colorMode: "rloc" });
  });

  it("ignora una preferencia de área que este snapshot no tiene", () => {
    const plan = planSnapshotView(snapshot(false), stats("rloc"), {
      areaMetric: "ffiCrossings",
      colorMode: "risk",
      showLabels: true
    });

    expect(plan.areaMetric).toBe("rloc");
  });

  it("no abre por el estado de migración si no hay lente de migración", () => {
    const plan = planSnapshotView(snapshot(false), stats("rloc"), {
      areaMetric: "rloc",
      colorMode: "status",
      showLabels: true
    });

    expect(plan.colorMode).toBe("risk");
  });
});

describe("keepArea", () => {
  it("conserva el área que se está mirando si sigue existiendo", () => {
    expect(keepArea("fanIn", new Set(["rloc", "fanIn"]), "rloc")).toBe("fanIn");
  });

  it("cae al área planificada si la que se miraba ya no está", () => {
    expect(keepArea("ffiCrossings", new Set(["rloc"]), "rloc")).toBe("rloc");
  });
});

describe("keepColor", () => {
  it("conserva los tres modos que no son una métrica", () => {
    const coverage = new Set<string>();
    expect(keepColor("risk", coverage)).toBe("risk");
    expect(keepColor("structure", coverage)).toBe("structure");
    expect(keepColor("status", coverage)).toBe("status");
  });

  it("conserva la métrica si el snapshot nuevo la trae", () => {
    expect(keepColor("fanIn", new Set(["fanIn"]))).toBe("fanIn");
  });

  it("cae al riesgo si la métrica desaparece", () => {
    expect(keepColor("fanIn", new Set(["rloc"]))).toBe("risk");
  });
});
