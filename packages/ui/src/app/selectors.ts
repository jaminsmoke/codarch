import type { CcStats } from "@codarch/schema/browser";
import { orderedMetrics } from "../metrics";
import type { CodarchOption, MapId } from "./types";

/**
 * Las opciones de los tres selectores de la barra.
 *
 * Son una función del snapshot, no del hook: qué métricas se ofrecen, cómo se
 * llaman y qué se puede pintar se decide igual en la web y en el escritorio
 * (ADR 0049). Sin React de por medio, la regla se puede leer de un vistazo y
 * probar sin montar la app.
 */

/** Las métricas del snapshot, en el orden en que se ofrecen. */
export function metricOptionsFor(stats: CcStats | null): string[] {
  return stats
    ? orderedMetrics(stats.metricCoverage.map((entry) => entry.name))
    : [];
}

/**
 * El título de una métrica: el que trae el snapshot, si lo trae.
 *
 * El snapshot puede renombrar `rloc` en su `attributeDescriptors`, y la app
 * enseña el nombre del fichero, no el suyo.
 */
export function metricTitles(
  descriptors: Record<string, { title?: string }> | undefined
): (key: string) => string {
  return (key) => descriptors?.[key]?.title ?? key;
}

/** El selector de área: una opción por métrica, con su título. */
export function areaOptionsFor(
  metrics: readonly string[],
  title: (key: string) => string
): CodarchOption[] {
  return metrics.map((key) => ({ value: key, label: title(key) }));
}

/** De qué dispone el mapa para pintarse ahora mismo. */
export interface ColorSources {
  /** El mapa que ocupa el escenario (ADR 0093). */
  map: MapId;
  /** Hay artefacto de lint que pintar (ADR 0094). */
  lint: boolean;
  /** El snapshot trae churn. */
  churn: boolean;
  /** El snapshot trae la lente de migración. */
  migration: boolean;
  /** Las opciones de área: una métrica también tiñe el mapa. */
  area: readonly CodarchOption[];
}

/**
 * El selector de color.
 *
 * Riesgo y estructura no dependen del snapshot y están siempre. El lint solo
 * si hay artefacto —sin él la lente no tendría nada que pintar—, el calor si
 * hay churn y el estado de migración si existe la lente. El mapa del resto no
 * tiene riesgo, estructura ni migración: se pinta por tipo (ADR 0093). Las
 * métricas del área entran al final, porque también son colores.
 */
export function colorOptionsFor(sources: ColorSources): CodarchOption[] {
  const options: CodarchOption[] = [];
  if (sources.map === "code") {
    options.push({ value: "risk", label: "Riesgo" });
    options.push({ value: "structure", label: "Estructura" });
    if (sources.lint) options.push({ value: "lint", label: "Lint" });
    if (sources.churn) options.push({ value: "churn", label: "Calor (commits)" });
    if (sources.migration) {
      options.push({ value: "status", label: "Estado de migración" });
    }
  } else {
    options.push({ value: "kind", label: "Tipo" });
  }
  return [...options, ...sources.area];
}
