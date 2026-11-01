/**
 * La deuda de lint de una carpeta, con el score que pesa en el riesgo.
 *
 * La cuenta —errores, avisos, info, hallazgos y ficheros— vive en
 * `@codarch/lint`, que es la misma que usan el CLI y el MCP (ADR 0094,
 * ADR 0096). Aquí solo se le añade `score`, que es la fórmula del riesgo:
 * errores + ¼ de avisos.
 *
 * En este módulo viven también las palabras de la severidad y la forma de
 * pintarlas, para que Métricas y Reglas no digan «errores» queriendo decir dos
 * cosas distintas: las tres cuentas de un ámbito se leen siempre igual.
 */

import {
  lintRules,
  lintTotals as sharedTotals,
  withinLintFolder,
  worstLintSeverity,
  type LintRuleCount,
  type LintSeverity,
  type LintTotals as SharedTotals
} from "@codarch/lint/browser";
import { lintScore } from "@codarch/metrics/browser";
import { formatCompact } from "@codarch/render/browser";

export type { LintRuleCount };

export interface LintTotals extends SharedTotals {
  /** `errores + ¼ avisos`, la cifra que pesa en el riesgo del fichero. */
  score: number;
}

/** Las tres severidades, de lo que pesa a lo que no. */
export const SEVERITIES: readonly LintSeverity[] = ["error", "warn", "info"];

/** La palabra de cada severidad, en singular y plural. */
export const SEVERITY_WORDS: Record<LintSeverity, [string, string]> = {
  error: ["error", "errores"],
  warn: ["aviso", "avisos"],
  info: ["info", "info"]
};

/** «3 errores»: una cuenta con su palabra, nunca sumada a otra severidad. */
export function severityText(count: number, severity: LintSeverity): string {
  const [one, many] = SEVERITY_WORDS[severity];
  return `${formatCompact(count)} ${count === 1 ? one : many}`;
}

/** La cuenta de una severidad dentro de unos totales. */
export function severityCount(
  totals: { errors: number; warnings: number; info: number },
  severity: LintSeverity
): number {
  if (severity === "error") return totals.errors;
  if (severity === "warn") return totals.warnings;
  return totals.info;
}

/** Si una ruta del artefacto cuelga de una carpeta; `""` es todo. */

/**
 * La marca del punto de lint en la barra (ADR 0094).
 *
 * `null` si no se midió o el ámbito está limpio. Si hay hallazgos, la severidad
 * es la peor presente y la etiqueta cuenta solo esa severidad, en español, para
 * el `aria-label` del botón («3 errores de lint»).
 */
export function lintBarMark(
  totals: SharedTotals | null
): { severity: LintSeverity; label: string } | null {
  if (!totals) return null;
  const severity = worstLintSeverity(totals);
  if (!severity) return null;
  return {
    severity,
    label: `${severityText(severityCount(totals, severity), severity)} de lint`
  };
}

export const withinFolder = withinLintFolder;

/**
 * Los totales de lint de una carpeta, o `null` cuando no hay artefacto.
 *
 * `null` es «sin medir», no «limpio»: un proyecto sin lint no tiene 0 errores,
 * tiene la señal apagada (ADR 0094).
 */
export function lintTotals(
  artifact: Parameters<typeof sharedTotals>[0],
  folder = ""
): LintTotals | null {
  const totals = sharedTotals(artifact, folder);
  if (!totals) return null;
  return {
    ...totals,
    score: lintScore(totals.errors, totals.warnings)
  };
}

export { lintRules };
