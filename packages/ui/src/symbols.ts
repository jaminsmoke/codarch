import type { CcSymbol } from "@codarch/schema/browser";
import { SYMBOL_LABEL } from "./labels";

/**
 * El orden en que la ficha enseña los tipos (ADR 0063).
 *
 * Primero lo que se ejecuta y luego lo que describe: una función es la puerta
 * natural a la cadena; una constante de configuración se lee después.
 */
export const SYMBOL_KIND_ORDER: readonly CcSymbol["kind"][] = [
  "function",
  "class",
  "interface",
  "type",
  "enum",
  "variable"
];

export const SYMBOL_KIND_TITLE: Record<CcSymbol["kind"], string> = {
  function: "Funciones",
  class: "Clases",
  interface: "Interfaces",
  type: "Tipos",
  enum: "Enums",
  variable: "Variables"
};

export interface SymbolKindGroup {
  kind: CcSymbol["kind"];
  title: string;
  symbols: CcSymbol[];
}

/**
 * Agrupa los símbolos por tipo sin perder el orden del modelo dentro de cada
 * grupo: las funciones llegan de la más compleja a la más simple y el resto
 * por línea (ADR 0062).
 */
export function groupSymbols(symbols: readonly CcSymbol[]): SymbolKindGroup[] {
  return SYMBOL_KIND_ORDER.map((kind) => ({
    kind,
    title: SYMBOL_KIND_TITLE[kind],
    symbols: symbols.filter((symbol) => symbol.kind === kind)
  })).filter((group) => group.symbols.length > 0);
}

/**
 * El resumen de una sección de símbolos (ADR 0062 · ADR 0063).
 *
 * Cuando la sección está plegada, el título ya lleva la cuenta total; el
 * resumen cuenta el reparto por tipo y la complejidad del símbolo más pesado.
 * Si ningún símbolo trae complejidad, se dice tal cual en vez de inventar un
 * cero.
 */
export function symbolSummary(
  symbols: readonly Pick<CcSymbol, "kind" | "complexity">[]
): string | undefined {
  if (symbols.length === 0) return undefined;

  const counts = new Map<CcSymbol["kind"], number>();
  let max = 0;
  for (const symbol of symbols) {
    counts.set(symbol.kind, (counts.get(symbol.kind) ?? 0) + 1);
    max = Math.max(max, symbol.complexity ?? 0);
  }

  const kinds = SYMBOL_KIND_ORDER.filter((kind) => counts.has(kind))
    .map((kind) => `${counts.get(kind)} ${SYMBOL_LABEL[kind]}`)
    .join(" · ");

  return max > 0 ? `${kinds} · máx. ${max}` : kinds;
}
