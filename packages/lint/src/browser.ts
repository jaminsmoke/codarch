/**
 * Entrada browser-safe del lint.
 *
 * Los normalizadores usan `node:path` para relativizar lo que devuelve ESLint;
 * el artefacto ya viene con rutas relativas, así que la app solo necesita el
 * formato y las cuentas.
 */

export {
  LINT_FILE,
  LINT_ARTIFACT_VERSION,
  LintError,
  canonicalLintPath,
  createLintArtifact,
  readLintArtifact
} from "./format";
export type {
  LintArtifact,
  LintFile,
  LintFileResult,
  LintMessage,
  LintRule,
  LintSeverity,
  LintSummary,
  LintSystem
} from "./format";
export { MINIMAL_LINT, adviceForExtensions, extensionOf } from "./advice";
export type { LintAdvice } from "./advice";
export {
  lintFileCounts,
  lintRuleCounts,
  lintRules,
  lintTotals,
  withinLintFolder
} from "./rollup";
export type { LintFileCount, LintRuleCount, LintTotals } from "./rollup";
