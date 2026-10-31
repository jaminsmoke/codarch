import {
  type Lens,
  type RenderFile,
  type RenderMetric,
  type RenderOptions,
  RenderError
} from "./model-types";

/**
 * Con qué lente abre el mapa y qué fichero queda seleccionado.
 *
 * Las dos respuestas dependen de lo que se pidió por la línea de órdenes, así
 * que se resuelven juntas y antes de pintar: un color pedido que el snapshot no
 * trae es un error, y la selección inicial tiene que ser un fichero del mapa.
 */

/** La lente con la que abre el mapa: la pedida, o el riesgo. */
export function resolveLens(
  coverage: ReadonlySet<string>,
  options: RenderOptions
): { initialLens: Lens; initialMetric: string | null } {
  // `structure` y `kind` no leen ninguna métrica: el color sale de la sección
  // y del tipo del resto, que el modelo ya lleva (ADR 0093).
  if (options.color === "structure" || options.color === "kind") {
    return { initialLens: options.color, initialMetric: null };
  }

  // La lente del lint no lee el snapshot: lee el artefacto, que va aparte
  // (ADR 0094). Sin artefacto no hay nada que pintar y se dice.
  if (options.color === "lint") {
    if (!options.lint) {
      throw new RenderError(
        "la lente del lint necesita el artefacto del proyecto: ejecuta codarch analyze"
      );
    }
    return { initialLens: "lint", initialMetric: null };
  }

  if (options.color && options.color !== "risk") {
    if (!coverage.has(options.color)) {
      throw new RenderError(
        `la métrica de color "${options.color}" no existe en este cc.json`
      );
    }
    return { initialLens: "metric", initialMetric: options.color };
  }

  return { initialLens: "risk", initialMetric: null };
}

/** El fichero que abre seleccionado: el que destaca en la lente con la que se mira. */
export function pickDefaultSelection(
  files: readonly RenderFile[],
  lens: Lens,
  metric: string | null,
  metrics: readonly RenderMetric[]
): number | null {
  if (files.length === 0) return null;

  if (lens === "metric" && metric) {
    const index = metrics.findIndex((entry) => entry.key === metric);
    if (index >= 0) {
      let best: RenderFile | null = null;
      for (const file of files) {
        const value = file.values[index];
        if (value === null || value === undefined) continue;
        if (!best || value > (best.values[index] ?? -Infinity)) best = file;
      }
      if (best) return best.index;
    }
  }

  if (lens === "structure" || lens === "kind") {
    return files.reduce((best, file) =>
      file.actualArea > best.actualArea ? file : best
    ).index;
  }

  return files.reduce((best, file) => (file.risk > best.risk ? file : best)).index;
}
