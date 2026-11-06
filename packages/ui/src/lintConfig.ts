import type { LintArtifact, LintRule } from "@codarch/lint/browser";

/**
 * La configuración del lint, leída del artefacto.
 *
 * Es el único sitio de la UI que toca `meta.systems` y `meta.tools`. Cuando el
 * contrato cambie, se adapta aquí: las vistas no leen esos campos. No es un
 * DTO nuevo; es una lectura interna de lo que el artefacto ya trae.
 *
 * No incluye hallazgos. Un sistema y sus reglas activas son configuración.
 */

export interface LintConfigRule {
  id: string;
  /** La severidad que escribe la config, no un hallazgo. */
  severity: LintRule["severity"];
}

export interface LintConfigSystem {
  name: string;
  config: string | null;
  rules: readonly LintConfigRule[];
  note?: string;
}

export interface LintConfigView {
  tools: readonly string[];
  systems: readonly LintConfigSystem[];
}

/** La config del artefacto, o `null` si no hay artefacto. */
export function readLintConfig(artifact: LintArtifact | null): LintConfigView | null {
  if (!artifact) return null;
  return {
    tools: [...artifact.meta.tools],
    systems: artifact.meta.systems.map((system) => ({
      name: system.name,
      config: system.config,
      rules: (system.rules ?? []).map((rule) => ({
        id: rule.id,
        severity: rule.severity
      })),
      ...(system.note ? { note: system.note } : {})
    }))
  };
}
