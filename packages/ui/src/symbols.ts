import type { CcSymbol } from "@codarch/schema/browser";

/**
 * El resumen de una sección de símbolos (ADR 0062).
 *
 * Cuando la sección está plegada, el título ya lleva la cuenta; el resumen
 * cuenta lo que no se ve: la complejidad del símbolo más pesado. Si ningún
 * símbolo trae complejidad, se dice tal cual en vez de inventar un cero.
 */
export function symbolSummary(
  symbols: readonly Pick<CcSymbol, "complexity">[]
): string | undefined {
  if (symbols.length === 0) return undefined;
  const max = symbols.reduce(
    (value, symbol) => Math.max(value, symbol.complexity ?? 0),
    0
  );
  return max > 0 ? `complejidad máx. ${max}` : "sin complejidad";
}
