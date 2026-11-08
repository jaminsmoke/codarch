import type { LintSeverity } from "./format";

/**
 * El mínimo que CodArch recomienda a cualquier proyecto, por herramienta.
 *
 * Es un set pequeño y mantenido, no el catálogo entero de la herramienta: una
 * lista de miles envejece con cada versión y no cabe en una ficha. Las
 * recomendaciones específicas de un proyecto se calculan aparte con señales
 * seguras (ADR 0112).
 */
export interface RecommendedRule {
  id: string;
  severity: Exclude<LintSeverity, "info">;
}

const ESLINT: readonly RecommendedRule[] = [
  { id: "no-debugger", severity: "error" },
  { id: "no-eval", severity: "error" },
  { id: "no-unreachable", severity: "error" },
  { id: "no-var", severity: "error" },
  { id: "prefer-const", severity: "error" }
];

const OXLINT: readonly RecommendedRule[] = [
  { id: "no-constant-binary-expression", severity: "error" },
  { id: "no-debugger", severity: "error" },
  { id: "no-eval", severity: "error" },
  { id: "no-implied-eval", severity: "error" },
  { id: "no-unreachable", severity: "error" },
  { id: "no-unused-vars", severity: "warn" },
  { id: "no-var", severity: "error" }
];

const BIOME: readonly RecommendedRule[] = [
  { id: "correctness/noUnusedVariables", severity: "warn" },
  { id: "suspicious/noDebugger", severity: "error" },
  { id: "suspicious/noDoubleEquals", severity: "error" },
  { id: "style/useConst", severity: "error" },
  { id: "style/useTemplate", severity: "warn" }
];

const CHECKSTYLE: readonly RecommendedRule[] = [
  { id: "LineLength", severity: "error" },
  { id: "NeedBraces", severity: "error" },
  { id: "UnusedImports", severity: "error" }
];

const BY_SYSTEM: Record<string, readonly RecommendedRule[]> = {
  eslint: ESLINT,
  oxlint: OXLINT,
  biome: BIOME,
  checkstyle: CHECKSTYLE
};

/** Las recomendadas de un sistema; vacío si no hay un set para él. */
export function recommendedRules(system: string): readonly RecommendedRule[] {
  return BY_SYSTEM[system] ?? [];
}
