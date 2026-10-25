import { describe, expect, it } from "vitest";
import type { RenderFile, RenderMetric, RenderModel } from "@codarch/render/browser";
import {
  fileMetricRows,
  metricShare,
  metricState,
  orderedMetrics,
  riskState
} from "../src/metrics";

describe("orden de las métricas", () => {
  it("pone primero las preferidas y respeta su orden", () => {
    expect(orderedMetrics(["zeta", "loc", "rloc", "alpha"])).toEqual([
      "rloc",
      "loc",
      "alpha",
      "zeta"
    ]);
  });

  it("no inventa métricas que no están en el snapshot", () => {
    expect(orderedMetrics(["alpha"])).toEqual(["alpha"]);
  });
});

function metric(key: string, extra: Partial<RenderMetric> = {}): RenderMetric {
  return {
    key,
    title: key,
    direction: -1,
    min: 0,
    max: 100,
    actualMax: 100,
    p95: 100,
    mode: "linear",
    coverage: 4,
    ...extra
  };
}

function part(value: number, p95: number, weight: number) {
  return { value, p95, norm: 0, weight, share: 0 };
}

function file(values: Array<number | null>, risk = 0.65): RenderFile {
  return {
    index: 0,
    nodeId: "file:src/a.ts",
    path: "src/a.ts",
    name: "a.ts",
    section: 0,
    area: 10,
    actualArea: 10,
    risk,
    riskParts: {
      complexity: part(15, 27, 0.5),
      churn: part(11, 10, 0.32),
      size: part(1300, 499, 0.18)
    },
    complexity: 15,
    churn: 11,
    values
  };
}

function model(metrics: RenderMetric[], files: RenderFile[]): RenderModel {
  return { metrics, files } as unknown as RenderModel;
}

describe("el estado de una métrica", () => {
  it("no pinta las métricas sin dirección de deuda", () => {
    expect(metricState(900, metric("fanIn", { direction: 1, p95: 10 }))).toBe(
      "none"
    );
    expect(metricState(900, metric("functions", { direction: 0, p95: 10 }))).toBe(
      "none"
    );
  });

  it("sube de neutro a ocre y a deuda con el p95", () => {
    expect(metricState(50, metric("rloc"))).toBe("ok");
    expect(metricState(80, metric("rloc"))).toBe("watch");
    expect(metricState(100, metric("rloc"))).toBe("debt");
    expect(metricState(400, metric("rloc"))).toBe("debt");
  });

  it("sin p95, cualquier valor positivo es una excepción", () => {
    const cycles = metric("inCycle", { p95: 0, actualMax: 1 });
    expect(metricState(0, cycles)).toBe("ok");
    expect(metricState(1, cycles)).toBe("debt");
  });

  it("un valor que no existe no tiene estado", () => {
    expect(metricState(null, metric("rloc"))).toBe("none");
  });
});

describe("la barra de una métrica", () => {
  it("compara con el p95 y se corta en el 100 %", () => {
    expect(metricShare(50, metric("rloc"))).toBe(0.5);
    expect(metricShare(200, metric("rloc"))).toBe(1);
  });

  it("usa el máximo real cuando el p95 es 0", () => {
    expect(
      metricShare(3, metric("ffiCrossings", { p95: 0, actualMax: 6 }))
    ).toBe(0.5);
    expect(
      metricShare(0, metric("ffiCrossings", { p95: 0, actualMax: 0 }))
    ).toBe(0);
  });

  it("respeta la escala logarítmica del mapa", () => {
    expect(
      metricShare(10, metric("rloc", { mode: "log", p95: 100 }))
    ).toBeCloseTo(Math.log1p(10) / Math.log1p(100), 5);
  });

  it("una métrica ausente no llena la barra", () => {
    expect(metricShare(null, metric("rloc"))).toBe(0);
  });
});

describe("el semáforo del riesgo", () => {
  it("cambia en 40 y 70 sobre 100", () => {
    expect(riskState(0.39)).toBe("ok");
    expect(riskState(0.4)).toBe("watch");
    expect(riskState(0.69)).toBe("watch");
    expect(riskState(0.7)).toBe("debt");
  });
});

describe("las filas de la ficha del fichero", () => {
  const metrics = [
    metric("imports"),
    metric("fanIn", { direction: 1 }),
    metric("number_of_commits"),
    metric("maxComplexity"),
    metric("rloc"),
    metric("migrationDebt"),
    metric("custom")
  ];

  it("pone el riesgo primero y no repite ninguna métrica", () => {
    const rows = fileMetricRows(
      model(metrics, [file([1, 2, 3, 4, 5, 6, 7])]),
      file([1, 2, 3, 4, 5, 6, 7]),
      "rloc",
      (key) => key
    );
    const keys = rows.map((row) => row.key);
    expect(keys[0]).toBe("risk");
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.slice(1).sort()).toEqual(
      metrics.map((entry) => entry.key).sort()
    );
  });

  it("ordena por el orden fijo de la ficha, no por el del modelo", () => {
    const rows = fileMetricRows(
      model(metrics, [file([1, 2, 3, 4, 5, 6, 7])]),
      file([1, 2, 3, 4, 5, 6, 7]),
      "rloc",
      (key) => key
    );
    expect(rows.slice(1).map((row) => row.key)).toEqual([
      "rloc",
      "maxComplexity",
      "number_of_commits",
      "fanIn",
      "migrationDebt",
      "imports",
      "custom"
    ]);
  });

  it("marca el área en la métrica que la decide", () => {
    const rows = fileMetricRows(
      model(metrics, [file([1, 2, 3, 4, 5, 6, 7])]),
      file([1, 2, 3, 4, 5, 6, 7]),
      "maxComplexity",
      (key) => key
    );
    expect(rows.filter((row) => row.area).map((row) => row.key)).toEqual([
      "maxComplexity"
    ]);
    expect(rows[0]?.area).toBe(false);
  });

  it("enseña el riesgo sobre 100 con su semáforo", () => {
    const rows = fileMetricRows(
      model([], []),
      file([], 0.65),
      null,
      (key) => key
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      key: "risk",
      value: 65,
      state: "watch",
      risk: true
    });
    expect(rows[0]?.share).toBeCloseTo(0.65, 5);
  });

  it("deja los huecos en null, sin barra ni color", () => {
    const rows = fileMetricRows(
      model([metric("rloc")], [file([null])]),
      file([null]),
      "rloc",
      (key) => key
    );
    expect(rows[1]).toMatchObject({
      key: "rloc",
      value: null,
      share: 0,
      state: "none"
    });
  });

  it("usa el título del snapshot", () => {
    const rows = fileMetricRows(
      model([metric("rloc")], [file([5])]),
      file([5]),
      "rloc",
      () => "Líneas de código"
    );
    expect(rows[1]?.title).toBe("Líneas de código");
  });

  it("lleva la explicación de la métrica a la fila", () => {
    const rows = fileMetricRows(
      model(
        [metric("rloc", { description: "Líneas con al menos un token" })],
        [file([5])]
      ),
      file([5]),
      "rloc",
      () => "Líneas de código"
    );

    expect(rows[1]?.description).toBe("Líneas con al menos un token");
    expect(rows[0]?.description).toContain("Combinación");
  });
});
