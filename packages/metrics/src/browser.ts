export { CONFIG_VERSION } from "@codarch/versions";
export { MAX_METRICS } from "./diff-totals";
export { aggregateFolder } from "./folder-aggregate";
export type { FolderAggregate, FolderMetricFile } from "./folder-aggregate";
export {
  ConfigError,
  parseIgnoreConfig,
  parseIgnoreYaml
} from "./scope";
export {
  CHURN_METRIC_CANDIDATES,
  COMPLEXITY_METRIC_CANDIDATES,
  LINT_WARNING_WEIGHT,
  RISK_GAMMA,
  RISK_LINT_ALPHA,
  RISK_LINT_DSAT,
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
  RiskConfidence,
  RiskContribution,
  RiskContributions,
  RiskLintApplicability,
  RiskLintAssessment,
  RiskLintCoverage,
  RiskLintCoverageInput,
  RiskLintInput,
  RiskOptions,
  RiskPart,
  RiskLintCounts,
  RiskLintReason,
  RiskSignals,
  RiskStatus
} from "./risk";
export type {
  ChangedFile,
  CycleComponent,
  DiffFile,
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
export type { RuleReport, RuleViolation, ViolationType } from "./rules";
export {
  DOMAIN_PROFILES,
  domainProfileIds,
  findDomainProfile
} from "./profiles";
export type { DomainProfile } from "./profiles";
export {
  REPORT_SCHEMA_VERSION,
  emptyMigrationReport,
  migrationFiles,
  parseReport
} from "./report";
