export { TypeScriptParser } from "./ts/parser";
export { ImportResolver, isAssetSpecifier } from "./resolve";
export type { ResolveResult } from "./resolve";
export { buildGraph } from "./graph";
export type {
  DependencyLink,
  FileGraphMetrics,
  GraphEdge,
  GraphResult
} from "./graph";
export { analyzeRepository } from "./analyze";
export type {
  AnalyzeOptions,
  AnalyzeResult,
  GitSummary,
  UnresolvedImportIssue
} from "./analyze";
export { analyzeFiles } from "./analyze-core";
export type {
  AnalyzeCoreOptions,
  AnalyzeCoreResult,
  ChurnMetric,
  ChurnResult
} from "./analyze-core";
export { ChurnCache, collectGitChurn, gitHead, gitStatus, withHeadExport } from "./git";
export { compareWorkingTreeWithHead, type HeadComparison } from "./head-diff";
export type {
  GitChange,
  GitChangeKind,
  GitChurnFile,
  GitChurnOptions,
  GitChurnResult,
  GitStatus
} from "./git";
export { ChangeGate, isLiveIgnored } from "./pulse";
export type { Pulse } from "./pulse";
export { AnalysisSession } from "./session";
export type { SessionOptions } from "./session";
export { ParseCache } from "./cache";
export type { CachedParse } from "./cache";
export { buildSnapshot } from "./snapshot";
export type { SnapshotFile, SnapshotInput } from "./snapshot";
export {
  buildMigration,
  ffiKindForSpecifier,
  isNativeLanguage,
  isTsJsLanguage,
  jsIsBridge,
  languageForPath,
  measureRustSource,
  rustIsBridge,
  MIGRATION_EXTENSIONS
} from "./migration";
export type {
  MigrationFileInput,
  MigrationLinkInput,
  MigrationResult
} from "./migration";
export { DEFAULT_EXTENSIONS, walkSourceFiles } from "./walk";
export type { WalkedFile, WalkOptions, WalkResult } from "./walk";
export { ensureGitignoreEntry } from "./gitignore";
export { readSourceSnippet } from "./source";
export type { SourceSnippet } from "./source";
export { protectedRootReason, type RootGuardOptions } from "./safety";
export {
  GIT_CHANGED,
  watchRepository,
  type RepositoryWatcher,
  type WatchMode,
  type WatchRepositoryOptions
} from "./watch";
export { MemoryFileSystem, directoryOf } from "./fs";
export type { DirectoryEntry, FileSystem, FileVersion } from "./fs";
export { NodeFileSystem } from "./node-fs";
export * as path from "./path";
export type {
  FileParseResult,
  ImportKind,
  Metrics,
  ParsedImport,
  ParsedSymbol,
  SourceParser
} from "./types";
