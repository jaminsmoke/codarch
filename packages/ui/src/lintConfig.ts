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

/** Hay herramientas o sistemas que enseñar. Un artefacto sin catálogo no cuenta. */
export function lintCatalogPresent(artifact: LintArtifact | null): boolean {
  const config = readLintConfig(artifact);
  if (!config) return false;
  return config.tools.length > 0 || config.systems.length > 0;
}

/**
 * Si la hoja Docs y config se puede abrir, y qué catálogo trae cada dominio.
 *
 * El mapa del resto y el catálogo de lint de código son fuentes distintas: una
 * no fabrica a la otra. El botón se enciende si hay alguna.
 */
export interface DocsConfigAccess {
  enabled: boolean;
  code: boolean;
  docs: boolean;
}

export function docsConfigAccess(input: {
  /** Hay `rest.cc.json`. No se inventa uno. */
  rest: boolean;
  codeLint: LintArtifact | null;
  docsLint: LintArtifact | null;
}): DocsConfigAccess {
  const code = lintCatalogPresent(input.codeLint);
  const docs = lintCatalogPresent(input.docsLint);
  return { enabled: input.rest || code || docs, code, docs };
}

/**
 * Qué hace pulsar Docs y config.
 *
 * Con mapa del resto se cambia de mapa. Sin él, y con catálogo, se abre solo
 * la hoja de configuración: el escenario del código no se convierte en un
 * resto ficticio.
 */
export type DocsToolPlan = "disabled" | "rest-map" | "catalog-only";

export function planDocsTool(input: {
  rest: boolean;
  codeLint: LintArtifact | null;
  docsLint: LintArtifact | null;
}): DocsToolPlan {
  const access = docsConfigAccess(input);
  if (!access.enabled) return "disabled";
  return input.rest ? "rest-map" : "catalog-only";
}
