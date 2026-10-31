import { describe, expect, it } from "vitest";
import type { CcJson, CcStats } from "@codarch/schema/browser";
import {
  keepArea,
  keepColor,
  planMapSwitch,
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

/**
 * Un snapshot con la lente a medias: sin resumen no se puede pintar el estado,
 * así que la app no la da por lente (`readMigration`).
 */
function snapshotASinResumen(): CcJson {
  return { lenses: { migration: { nodes: {} } } } as unknown as CcJson;
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

  it("no abre por el estado de migración con una lente sin resumen", () => {
    const plan = planSnapshotView(snapshotASinResumen(), stats("rloc", "migrationDebt"), {
      areaMetric: "rloc",
      colorMode: "status",
      showLabels: true
    });

    // Sin resumen no hay leyenda que enseñar: abre por la métrica de deuda.
    expect(plan.colorMode).toBe("migrationDebt");
  });
});

/** Un snapshot con un fichero, sus métricas y la lente de migración. */
function mapSnapshot(): CcJson {
  return {
    files: [{ id: "1", name: "a.ts", type: "File" }],
    lenses: {
      metrics: { attributes: { "1": { rloc: 10, migrationDebt: 2 } } },
      migration: {
        nodes: { "1": { status: "js", language: "typescript" } },
        edges: [],
        summary: {
          languages: {},
          status: { js: 1, rust: 0, bridge: 0, native: 0 },
          ffiEdges: 0,
          bridgeFiles: 0
        }
      }
    }
  } as unknown as CcJson;
}

describe("planMapSwitch", () => {
  it("no hace nada si ya se está en ese mapa", () => {
    expect(
      planMapSwitch({ next: "code", current: "code", cc: null, rest: null, preferences: null })
    ).toEqual({ kind: "same" });
  });

  it("sin mapa del resto no se puede ir al resto", () => {
    expect(
      planMapSwitch({
        next: "rest",
        current: "code",
        cc: snapshot(false),
        rest: null,
        preferences: null
      })
    ).toEqual({ kind: "blocked" });
  });

  it("el resto se mide en bytes y se pinta por tipo", () => {
    expect(
      planMapSwitch({
        next: "rest",
        current: "code",
        cc: snapshot(false),
        rest: snapshot(false),
        preferences: { areaMetric: "rloc", colorMode: "risk", showLabels: true }
      })
    ).toEqual({ kind: "switch", map: "rest", areaMetric: "bytes", colorMode: "kind" });
  });

  it("volver al código recupera el área y el color de las preferencias", () => {
    const plan = planMapSwitch({
      next: "code",
      current: "rest",
      cc: mapSnapshot(),
      rest: snapshot(false),
      preferences: { areaMetric: "rloc", colorMode: "status", showLabels: true }
    });

    expect(plan).toEqual({
      kind: "switch",
      map: "code",
      areaMetric: "rloc",
      colorMode: "status"
    });
  });

  it("sin snapshot del código vuelve sin preferencia y por el riesgo", () => {
    expect(
      planMapSwitch({
        next: "code",
        current: "rest",
        cc: null,
        rest: snapshot(false),
        preferences: { areaMetric: "rloc", colorMode: "risk", showLabels: true }
      })
    ).toEqual({ kind: "switch", map: "code", areaMetric: null, colorMode: "risk" });
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
  const lente = snapshot(true).lenses?.migration ?? null;

  it("conserva el riesgo y la estructura, que no dependen del snapshot", () => {
    const coverage = new Set<string>();
    expect(keepColor("risk", coverage, null)).toBe("risk");
    expect(keepColor("structure", coverage, null)).toBe("structure");
  });

  it("conserva el estado de migración si el refresco trae la lente", () => {
    expect(keepColor("status", new Set<string>(), lente)).toBe("status");
  });

  it("cae al riesgo si el refresco llega sin lente de migración", () => {
    // Sin lente, `mapColorFor` pinta todos los ficheros como `js`: el mapa se
    // queda de un solo color y la leyenda desaparece.
    expect(keepColor("status", new Set<string>(), null)).toBe("risk");
  });


  it("conserva la métrica si el snapshot nuevo la trae", () => {
    expect(keepColor("fanIn", new Set(["fanIn"]), null)).toBe("fanIn");
  });

  it("cae al riesgo si la métrica desaparece", () => {
    expect(keepColor("fanIn", new Set(["rloc"]), null)).toBe("risk");
  });
});
