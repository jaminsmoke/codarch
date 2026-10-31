export { CONFIG_VERSION } from "@codarch/versions";
export { ConfigError, parseIgnoreConfig } from "./scope";
export {
  ADDON_NAME,
  findProjectConfig,
  loadIgnoreConfig,
  loadProjectIgnore,
  loadRuleConfig,
  parseLayerList,
  parseProfileEntry,
  parseRuleConfig,
  parseRuleList
} from "./config";
export type {
  CyclesRuleConfig,
  ForbiddenRuleConfig,
  LayerConfig,
  RuleConfig,
  RuleConfigAddon,
  RuleConfigEntry,
  RuleSource,
  Severity,
  ThresholdRuleConfig
} from "./config";
export { diffSnapshots } from "./diff";
export { MAX_METRICS } from "./diff-totals";
export { aggregateFolder } from "./folder-aggregate";
export type { FolderAggregate, FolderMetricFile } from "./folder-aggregate";
export { buildSymbolReport } from "./symbol-diff";
export type {
  DiffSymbolChange,
  DiffSymbolFile,
  DiffSymbolReport,
  FileSource,
  SymbolSnapshot
} from "./symbol-diff";
export { countLineChanges, diffLines } from "./line-diff";
export type {
  DiffLineType,
  DiffRow,
  FileDiff,
  LineChanges
} from "./line-diff";
export {
  REPORT_SCHEMA_VERSION,
  emptyMigrationReport,
  migrationFiles,
  parseReport
} from "./report";
export type {
  ChangedFile,
  CycleComponent,
  DiffFile,
  DiffOptions,
  DiffReport,
  DiffSummary,
  DuplicationChangeKind,
  DuplicationPairChange,
  DuplicationReport,
  DuplicationSide,
  EdgeChange,
  Hotspot,
  MetricChange,
  MetricTotal,
  MigrationDelta,
  MigrationFileChange,
  MigrationFileDebt,
  MigrationReport,
  ReportTotals,
  SnapshotSummary
} from "./diff";
export { emptyRuleReport, evaluateRules } from "./rules";
export {
  DOMAIN_PROFILES,
  domainProfileIds,
  findDomainProfile,
  profileEntries
} from "./profiles";
export type { DomainProfile, DomainProfileEntry } from "./profiles";
export { suggestLayers } from "./suggest";
export type {
  Suggestion,
  SuggestedLayer,
  SuggestedRule
} from "./suggest";
export type {
  RuleCycle,
  RuleEdge,
  RuleFile,
  RuleInput,
  RuleReport,
  RuleViolation,
  ViolationType
} from "./rules";
export {
  CHURN_METRIC_CANDIDATES,
  COMPLEXITY_METRIC_CANDIDATES,
  LINT_WARNING_WEIGHT,
  RISK_GAMMA,
  RISK_WEIGHTS,
  RISK_WEIGHTS_WITH_LINT,
  firstMetric,
  lintScore,
  lintScores,
  riskBreakdown,
  riskScores
} from "./risk";
export type {
  RiskBreakdown,
  RiskOptions,
  RiskPart,
  RiskSignals
} from "./risk";
