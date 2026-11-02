import { useMemo } from "react";
import { getStats, type CcJson } from "@codarch/schema/browser";
import type { LintArtifact } from "@codarch/lint/browser";
import { buildRenderModel } from "@codarch/render/browser";
import { CHURN_METRIC } from "../labels";
import { readMigration } from "../data";
import { detailFor } from "../detail";
import type { AppView, MapId } from "./types";

/**
 * Lo que se deriva del snapshot que se está mirando.
 *
 * Las cuatro piezas van juntas porque salen del mismo dato y cambian a la vez:
 * el snapshot activo —el del código o el del resto (ADR 0093)—, sus
 * estadísticas, su lente de migración, si trae churn, el modelo del mapa y el
 * detalle que se dibuja con el foco puesto.
 */

export interface DerivedMapInput {
  cc: CcJson | null;
  /** El mapa de lo que no es código, si el proyecto lo trae (ADR 0093). */
  rest: CcJson | null;
  lint: LintArtifact | null;
  /** Las reglas del resto, si el proyecto las midió (ADR 0105). */
  restLint: LintArtifact | null;
  map: MapId;
  areaMetric: string | null;
  colorMode: string;
  /** La carpeta enfocada: su subárbol es lo que se dibuja. */
  focusPath: string | null;
}

export function useDerivedMap(input: DerivedMapInput) {
  const { cc, rest, lint, restLint, map, areaMetric, colorMode, focusPath } =
    input;

  const activeCc = map === "rest" && rest ? rest : cc;
  // Código → lint; resto → reglas. Cada mapa con su artefacto (ADR 0105).
  const activeLint = map === "rest" ? restLint : lint;
  const stats = useMemo(() => (activeCc ? getStats(activeCc) : null), [activeCc]);
  const migration = useMemo(() => readMigration(activeCc), [activeCc]);
  const hasChurn = useMemo(
    () =>
      stats
        ? stats.metricCoverage.some((entry) => entry.name === CHURN_METRIC)
        : false,
    [stats]
  );

  const view = useMemo<AppView>(() => {
    if (!activeCc || !areaMetric) return { model: null, error: null };
    try {
      return {
        model: buildRenderModel(activeCc, {
          areaMetric,
          // Una lente que este snapshot no puede construir —el estado sin su
          // lente, el lint o las reglas sin artefacto— se dibuja con el
          // riesgo: la banda del proyecto dice qué falta, en vez de quedarse
          // sin mapa.
          color:
            colorMode === "status" || (colorMode === "lint" && !activeLint)
              ? "risk"
              : colorMode,
          title: activeCc.meta.projectName,
          // El lint es del código; las reglas, del resto (ADR 0094, ADR 0105).
          lint: activeLint
        }),
        error: null
      };
    } catch (cause) {
      return { model: null, error: (cause as Error).message };
    }
  }, [activeCc, activeLint, areaMetric, colorMode]);

  const detail = useMemo(
    () => detailFor(view.model, focusPath),
    [view.model, focusPath]
  );

  return { activeCc, stats, migration, hasChurn, view, detail };
}
