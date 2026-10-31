import { describe, expect, it } from "vitest";
import type { RenderFile, RenderMetric, RenderModel } from "@codarch/render/browser";
import {
  fileMetricRows,
  metricShare,
  metricState,
  orderedMetrics,
  riskState,
  rollupMetricRows
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
      size: part(1300, 499, 0.18),
      lint: part(0, 0, 0)
    },
    complexity: 15,
    churn: 11,
    lint: 0,
    values,
    kind: null
  };
}

function model(
  metrics: RenderMetric[],
  files: RenderFile[],
  areaMetric: string | null = null
): RenderModel {
  return { metrics, files, areaMetric } as unknown as RenderModel;
}

const title = (key: string) => key;

const a = file([100, 15]);
const b = { ...file([50, 5]), path: "src/b.ts" };
const c = { ...file([null, null]), path: "src/c.ts" };
const subtree = [a, b, c];

describe("las filas de Métricas en proyecto y carpeta", () => {
  const metrics = [metric("loc"), metric("maxComplexity")];

  it("suma lo que se suma y toma el máximo de lo que ya es un máximo", () => {
    const rows = rollupMetricRows(model(metrics, subtree), subtree, title);
    const loc = rows.find((row) => row.key === "loc");
    const complexity = rows.find((row) => row.key === "maxComplexity");

    expect(loc?.value).toBe(150);
    expect(loc?.files).toBe(2);
    // La complejidad de la carpeta no es la suma: es el mayor, con su dueño.
    expect(complexity?.value).toBe(15);
    expect(complexity?.owner).toBe("src/a.ts");
  });

  it("la barra es la cobertura, no una escala que no existe", () => {
    const rows = rollupMetricRows(model(metrics, subtree), subtree, title);

    expect(rows.find((row) => row.key === "loc")?.share).toBeCloseTo(2 / 3);
    expect(rows.find((row) => row.key === "maxComplexity")?.share).toBeCloseTo(
      2 / 3
    );
  });

  it("sin ningún valor no hay cero: el valor es null", () => {
    const empty = rollupMetricRows(
      model(metrics, [c]),
      [c],
      title
    );

    expect(empty.find((row) => row.key === "loc")?.value).toBeNull();
  });

  it("añade la complejidad cuando el snapshot no la trae como métrica", () => {
    const rows = rollupMetricRows(model([metric("loc")], subtree), subtree, title);

    expect(rows.map((row) => row.key)).toEqual([
      "risk",
      "loc",
      "maxComplexity"
    ]);
    expect(rows.at(-1)?.title).toBe("Complejidad máx.");
  });

  it("un máximo de cero no nombra fichero: no lo tiene ninguno", () => {
    const cycles = [metric("inCycle"), metric("loc")];
    const rows = rollupMetricRows(
      model(cycles, [{ ...a, values: [0, 100] }, { ...b, values: [0, 50] }]),
      [{ ...a, values: [0, 100] }, { ...b, values: [0, 50] }],
      title
    );
    const inCycle = rows.find((row) => row.key === "inCycle");

    // El cero es un cero medido: hay valor, pero no hay fichero que lo tenga.
    expect(inCycle?.value).toBe(0);
    expect(inCycle?.owner).toBeNull();
    expect(inCycle?.hint).toContain("el máximo del subárbol es 0");
    expect(inCycle?.hint).not.toContain("src/a.ts");
  });

  it("una suma lleva la tinta de su peor fichero, con su nombre", () => {
    const debt = [metric("loc", { direction: -1, p95: 10 })];
    const files = [
      { ...a, path: "src/a.ts", values: [2] },
      { ...b, path: "src/b.ts", values: [20] },
      { ...c, path: "src/c.ts", values: [5] }
    ];
    const rows = rollupMetricRows(model(debt, files), files, title);
    const loc = rows.find((row) => row.key === "loc");

    // El total no se compara con el p95: la tinta dice que dentro hay deuda.
    expect(loc?.value).toBe(27);
    expect(loc?.state).toBe("debt");
    expect(loc?.worst).toBe("src/b.ts");
    expect(loc?.hint).toContain("el peor, src/b.ts (20 sobre p95 10)");
  });

  it("una métrica sin dirección de deuda no se tiñe", () => {
    const fanIn = [metric("fanIn", { direction: 1, p95: 1 })];
    const files = [{ ...a, values: [900] }];
    const rows = rollupMetricRows(model(fanIn, files), files, title);
    const row = rows.find((entry) => entry.key === "fanIn");

    expect(row?.state).toBe("none");
    expect(row?.worst).toBeNull();
    expect(row?.hint).not.toContain("el peor");
  });

  it("un máximo se tiñe con su propia cifra, que es la del peor fichero", () => {
    const complexity = [metric("maxComplexity", { direction: -1, p95: 14 })];
    const files = [
      { ...a, path: "src/a.ts", values: [5] },
      { ...b, path: "src/b.ts", values: [20] }
    ];
    const rows = rollupMetricRows(model(complexity, files), files, title);
    const row = rows.find((entry) => entry.key === "maxComplexity");

    expect(row?.state).toBe("debt");
    expect(row?.worst).toBe("src/b.ts");
    expect(row?.owner).toBe("src/b.ts");
  });

  it("un subárbol en el aviso se queda con el aviso, no con el verde", () => {
    const debt = [metric("loc", { direction: -1, p95: 10 })];
    const files = [
      { ...a, path: "src/a.ts", values: [1] },
      { ...b, path: "src/b.ts", values: [8] }
    ];
    const rows = rollupMetricRows(model(debt, files), files, title);
    const row = rows.find((entry) => entry.key === "loc");

    expect(row?.state).toBe("watch");
    expect(row?.worst).toBe("src/b.ts");
  });

  it("marca la métrica que decide el área", () => {
    const rows = rollupMetricRows(
      model(metrics, subtree, "loc"),
      subtree,
      title
    );

    expect(rows.find((row) => row.area)?.key).toBe("loc");
  });
});

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
