/**
 * La superficie del lint que comparten la entrada raíz y la del navegador.
 *
 * El formato, el consejo por extensión y las cuentas no tocan `node:path`; los
 * normalizadores y la ejecución sí, y se quedan en la entrada raíz.
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
  DOC_RULES,
  DOC_RULE_SEVERITY,
  docsFindings,
  matchesGlob,
  readFrontmatter,
  resolveLink
} from "./rest";
export type {
  DocRule,
  DocsFrontmatterRule,
  DocsRulesConfig,
  DocsRulesFile,
  DocsTwinPair,
  FrontmatterHead
} from "./rest";
export {
  lintFileCounts,
  lintRuleCounts,
  lintRules,
  lintTotals,
  withinLintFolder,
  worstLintSeverity
} from "./rollup";
export type { LintFileCount, LintRuleCount, LintTotals } from "./rollup";
export { parseDocsConfig, parseDocsYaml } from "./docs-config";
