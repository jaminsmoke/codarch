import { useMemo } from "react";
import type { LintArtifact } from "@codarch/lint/browser";
import type { CcStats } from "@codarch/schema/browser";
import type { readMigration } from "../data";
import {
  areaOptionsFor,
  colorOptionsFor,
  metricOptionsFor,
  metricTitles
} from "./selectors";
import type { CodarchOption, MapId } from "./types";

/**
 * Las opciones de los tres selectores de la barra.
 *
 * Qué métricas se ofrecen, cómo se llaman y qué colores se pueden elegir sale
 * del snapshot, y la lista de colores es **una** para el dock y Ajustes. Las
 * reglas están en `selectors.ts`; aquí se recuerdan entre renders.
 */

export interface ViewOptionsInput {
  stats: CcStats | null;
  /** Los títulos que el snapshot da a sus métricas, si los da. */
  descriptors: Record<string, { title?: string }> | undefined;
  map: MapId;
  lint: LintArtifact | null;
  hasChurn: boolean;
  migration: ReturnType<typeof readMigration>;
}

export function useViewOptions(input: ViewOptionsInput) {
  const { stats, descriptors, map, lint, hasChurn, migration } = input;

  const metricOptions = useMemo(() => metricOptionsFor(stats), [stats]);
  const metricTitle = useMemo(() => metricTitles(descriptors), [descriptors]);
  const areaOptions = useMemo<CodarchOption[]>(
    () => areaOptionsFor(metricOptions, metricTitle),
    [metricOptions, metricTitle]
  );
  const colorOptions = useMemo<CodarchOption[]>(
    () =>
      colorOptionsFor({
        map,
        lint: lint !== null,
        churn: hasChurn,
        migration: migration !== null,
        area: areaOptions
      }),
    [hasChurn, lint, migration, areaOptions, map]
  );

  return { metricOptions, metricTitle, areaOptions, colorOptions };
}
