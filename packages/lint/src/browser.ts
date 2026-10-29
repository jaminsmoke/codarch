/**
 * Entrada browser-safe del lint.
 *
 * Los normalizadores usan `node:path` para relativizar lo que devuelve ESLint;
 * el artefacto ya viene con rutas relativas, así que la app solo necesita el
 * formato y las cuentas.
 */

export {
  LINT_ARTIFACT_VERSION,
  LintError,
  canonicalLintPath,
  createLintArtifact
} from "./format";
export type {
  LintArtifact,
  LintFile,
  LintFileResult,
  LintMessage,
  LintSeverity,
  LintSummary
} from "./format";
