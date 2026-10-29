import type { CcMigrationLens } from "@codarch/schema/browser";
import { CHURN_METRIC } from "./labels";

/**
 * Lo que la cabecera dice cuando el color elegido no se puede pintar.
 *
 * El mapa tiene una sola forma de pintar (`mapColorFor`) y no todos los modos
 * dependen de lo mismo. Hay dos formas de quedarse sin color, y no se parecen:
 *
 * - **El estado de migración** necesita la lente del snapshot. Sin ella no hay
 *   estado que enseñar: los ficheros salen con el gris de `js` y la leyenda ni
 *   se dibuja. El mapa se queda **mudo**.
 * - **Una métrica** que no está —o el calor, que es `number_of_commits`— cae al
 *   riesgo: el mapa se pinta, pero el selector dice una cosa y la leyenda
 *   desaparece. El mapa **no** está mudo, pero **miente** sobre lo que enseña.
 *
 * Los dos merecen un aviso, y con distinto texto, por eso. `risk` y `structure`
 * salen siempre y no dicen nada; sin snapshot no hay nada que avisar.
 */
export interface PaintNotice {
  /** Lo que se lee en la banda del proyecto. */
  label: string;
  /** Lo que explica el `title` al pasar por encima. */
  title: string;
}

/** Lo poco que hace falta saber de una métrica del mapa. */
interface PaintedMetric {
  key: string;
}

export function paintNotice(
  colorMode: string,
  metrics: readonly PaintedMetric[] | null,
  migration: CcMigrationLens | null
): PaintNotice | null {
  if (colorMode === "status") {
    if (migration) return null;
    return {
      label: "sin lente de migración",
      title:
        "El color es el estado de migración y este snapshot no trae la lente: todos los ficheros salen con el mismo color y no hay leyenda. Elige otro color, o analiza un repositorio que la traiga."
    };
  }
  if (colorMode === "risk" || colorMode === "structure") return null;
  // Sin snapshot abierto no hay métricas que echar en falta.
  if (!metrics) return null;

  const needed = colorMode === "churn" ? CHURN_METRIC : colorMode;
  if (metrics.some((metric) => metric.key === needed)) return null;

  return {
    label: colorMode === "churn" ? "sin commits" : `sin la métrica ${colorMode}`,
    title:
      colorMode === "churn"
        ? `El color es el calor y este snapshot no trae la métrica \`${CHURN_METRIC}\`: el mapa se pinta con el riesgo y no hay leyenda.`
        : `El color es \`${colorMode}\` y este snapshot no trae esa métrica: el mapa se pinta con el riesgo y no hay leyenda. Elige otro color.`
  };
}
