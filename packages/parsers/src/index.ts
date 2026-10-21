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
export { collectGitChurn } from "./git";
export type { GitChurnFile, GitChurnOptions, GitChurnResult } from "./git";
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
export { MemoryFileSystem, directoryOf } from "./fs";
export type { DirectoryEntry, FileSystem } from "./fs";
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
