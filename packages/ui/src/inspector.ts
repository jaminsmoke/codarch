import type { CcSymbol } from "@codarch/schema/browser";
import type { RenderFile, RenderModel } from "@codarch/render/browser";
import type { CodeSnippet } from "./platform";
import type { CodeTarget } from "./panels/CodePeek";

/**
 * Las cuentas de la ficha del fichero, sin marcado.
 *
 * El inspector solo pinta: los ficheros de los que depende, cuánto pesa cada
 * símbolo sobre el más complejo del fichero y el estado del código abierto se
 * deciden aquí, para poder probarlos sin DOM.
 */

/** El código de un símbolo abierto en la ficha. */
export interface CodeState {
  target: CodeTarget;
  snippet: CodeSnippet | null;
  loading: boolean;
  error: string | null;
}

/**
 * Los ficheros a los que el fichero apunta (`out`) o que lo usan (`in`).
 *
 * Es una lista de rutas, sin repetir: dos aristas entre los mismos ficheros
 * cuentan una vez. Se ordena por ruta para que la lista no baile.
 */
export function relatedFiles(
  model: RenderModel | null,
  file: RenderFile,
  direction: "out" | "in"
): RenderFile[] {
  if (!model) return [];

  const found = new Map<string, RenderFile>();
  for (const edge of model.edges) {
    const owner = direction === "out" ? edge.from : edge.to;
    if (owner !== file.index) continue;
    const target = model.files[direction === "out" ? edge.to : edge.from];
    if (target) found.set(target.path, target);
  }

  return [...found.values()].sort((left, right) =>
    left.path.localeCompare(right.path)
  );
}

/** La complejidad del símbolo más pesado del fichero. */
export function maxComplexity(symbols: readonly CcSymbol[]): number {
  return symbols.reduce(
    (max, symbol) => Math.max(max, symbol.complexity ?? 0),
    0
  );
}

/** Qué parte de la barra llena un símbolo, relativa al más pesado del fichero. */
export function complexityShare(
  value: number | undefined,
  max: number
): number {
  if (!max || value === undefined) return 0;
  return Math.round((value / max) * 100);
}
