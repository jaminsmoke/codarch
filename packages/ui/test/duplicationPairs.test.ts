import { describe, expect, it } from "vitest";
import type { RenderFile, RenderModel } from "@codarch/render/browser";
import { duplicationPairs } from "../src/duplication";

/**
 * La lista de pares de la ficha (M70): qué cuenta en un subárbol y qué deja
 * pasar el filtro. El orden ya viene del modelo y aquí no se reordena.
 */

function file(path: string): RenderFile {
  const zero = { value: 0, p95: 0, norm: 0, weight: 0, share: 0 };
  return {
    index: 0,
    nodeId: path,
    path,
    name: path.split("/").pop() ?? path,
    section: 0,
    area: 1,
    actualArea: 1,
    risk: 0,
    riskParts: { complexity: zero, churn: zero, size: zero, lint: zero },
    riskBreakdown: null,
    complexity: 0,
    churn: 0,
    lint: 0,
    values: [1, 1],
    kind: null
  };
}

const web = file("apps/web/src/main.ts");
const panel = file("packages/ui/src/panel.ts");
const other = file("packages/ui2/src/other.ts");

// El modelo ordena por similitud: la copia literal primero, la divergencia
// después; la lista conserva ese orden.
const model = {
  duplication: {
    measured: true,
    nodes: {},
    pairsByNode: {},
    list: [
      {
        from: "packages/ui2/src/other.ts",
        to: "packages/ui/src/panel.ts",
        lines: 10,
        similarity: 100,
        status: "copy"
      },
      {
        from: "packages/ui/src/panel.ts",
        to: "apps/web/src/main.ts",
        lines: 20,
        similarity: 72,
        status: "diverging"
      }
    ],
    pairs: 2,
    duplicatedLines: 0,
    repeatedLines: 0
  }
} as unknown as RenderModel;

describe("la lista de pares de un subárbol", () => {
  it("cuenta un par solo cuando sus dos extremos están dentro", () => {
    // panel y other están en `packages`, pero el otro extremo del par
    // divergente (apps/web) queda fuera: ese par es del proyecto entero.
    const scope = duplicationPairs(model, [panel, other]);

    expect(scope.rows).toEqual([model.duplication.list[0]]);
    expect(scope.counts).toEqual({ all: 1, copy: 1, diverging: 0 });
  });

  it("el proyecto entero cuenta todos los pares, cada estado por separado", () => {
    const scope = duplicationPairs(model, [web, panel, other]);

    expect(scope.rows).toHaveLength(2);
    expect(scope.counts).toEqual({ all: 2, copy: 1, diverging: 1 });
  });

  it("filtra por estado sin cambiar el orden del modelo", () => {
    const copies = duplicationPairs(model, [web, panel, other], "copy");
    const diverging = duplicationPairs(
      model,
      [web, panel, other],
      "diverging"
    );

    expect(copies.rows.map((pair) => pair.from)).toEqual([
      "packages/ui2/src/other.ts"
    ]);
    expect(diverging.rows.map((pair) => pair.from)).toEqual([
      "packages/ui/src/panel.ts"
    ]);
    // El filtro no cambia las cuentas: sirven para las tres pestañas.
    expect(copies.counts).toEqual({ all: 2, copy: 1, diverging: 1 });
  });
});
