import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CcMigrationLens } from "@codarch/schema/browser";
import { paintNotice } from "../src/paintNotice";
import { ProjectBand } from "../src/shell/ProjectBand";
import type { CodarchApp } from "../src/app/types";

/** Una lente con lo mínimo que la app exige para darla por lente. */
function lente(): CcMigrationLens {
  return {
    nodes: {},
    edges: [],
    summary: {
      languages: {},
      status: { js: 0, rust: 0, bridge: 0, native: 0 },
      ffiEdges: 0,
      bridgeFiles: 0
    }
  } as unknown as CcMigrationLens;
}

/** Las métricas que pinta el mapa, que es lo único que se mira aquí. */
const metricas = (...keys: string[]) => keys.map((key) => ({ key }));

describe("el aviso del color elegido", () => {
  it("avisa cuando el estado de migración no tiene lente", () => {
    const aviso = paintNotice("status", metricas("rloc"), null);
    expect(aviso?.label).toBe("sin lente de migración");
    expect(aviso?.title).toContain("no trae la lente");
  });

  it("calla cuando la lente está", () => {
    expect(paintNotice("status", metricas("rloc"), lente())).toBeNull();
  });

  it("calla con los modos que se pintan siempre", () => {
    expect(paintNotice("risk", metricas("rloc"), null)).toBeNull();
    expect(paintNotice("structure", metricas("rloc"), null)).toBeNull();
  });

  it("avisa cuando la métrica del color no está en el snapshot", () => {
    const aviso = paintNotice("fanIn", metricas("rloc"), null);
    expect(aviso?.label).toBe("sin la métrica fanIn");
    expect(aviso?.title).toContain("se pinta con el riesgo");
  });

  it("calla cuando la métrica está", () => {
    expect(paintNotice("fanIn", metricas("rloc", "fanIn"), null)).toBeNull();
  });

  it("avisa del calor cuando falta la métrica de commits", () => {
    // El mapa pinta el calor por `number_of_commits`, no por «churn»: el alias
    // se resuelve o el aviso hablaría de una métrica que no existe.
    const aviso = paintNotice("churn", metricas("rloc"), null);
    expect(aviso?.label).toBe("sin commits");
    expect(aviso?.title).toContain("number_of_commits");
  });

  it("calla con el calor cuando la métrica de commits está", () => {
    expect(
      paintNotice("churn", metricas("rloc", "number_of_commits"), null)
    ).toBeNull();
  });

  it("calla si no hay snapshot: no hay métricas que echar en falta", () => {
    expect(paintNotice("fanIn", null, null)).toBeNull();
    expect(paintNotice("churn", null, null)).toBeNull();
  });
});

/** La banda del proyecto con lo mínimo que necesita. */
function banda(
  colorMode: string,
  migration: CcMigrationLens | null,
  metricKeys: string[] | null = ["rloc"]
): string {
  const app = {
    view: {
      model:
        metricKeys === null
          ? null
          : {
              meta: {},
              metrics: metricKeys.map((key) => ({ key, title: key }))
            }
    },
    migration,
    state: {
      source: "demo",
      watch: "none",
      refreshedAt: null,
      cc: null,
      colorMode
    }
  } as unknown as CodarchApp;
  return renderToStaticMarkup(createElement(ProjectBand, { app }));
}

describe("la cabecera", () => {
  it("dice que falta la lente cuando el color es el estado de migración", () => {
    expect(banda("status", null)).toContain("sin lente de migración");
  });

  it("dice que falta la métrica cuando el color es una que no está", () => {
    expect(banda("fanIn", lente(), ["rloc"])).toContain("sin la métrica fanIn");
  });

  it("no lo dice cuando la lente y la métrica están", () => {
    const html = banda("fanIn", lente(), ["rloc", "fanIn"]);
    expect(html).not.toContain("sin la métrica");
    expect(html).not.toContain("sin lente de migración");
  });

  it("no lo dice con los colores que se pintan siempre", () => {
    // La banda siempre dice «sin vigilancia»: lo que no puede salir es el aviso.
    expect(banda("risk", null)).not.toContain("paint-notice");
    expect(banda("structure", null)).not.toContain("paint-notice");
  });
});
