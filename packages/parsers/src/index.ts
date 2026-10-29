export { TS_PARSER_NAME, TypeScriptParser } from "./ts/parser";
export { JAVA_PARSER_NAME, JavaParser } from "./java/parser";
export { PYTHON_PARSER_NAME, PythonParser } from "./python/parser";
export { GO_PARSER_NAME, GoParser } from "./go/parser";
export { CSHARP_PARSER_NAME, CSharpParser } from "./csharp/parser";
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
export { extensionsFor, parserFor } from "./parsers";
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
export {
  analyzeRepo,
  forgetHeadReport,
  headReportFor,
  repoSession
} from "./repo-session";
export type { AnalyzeRepoOptions, RepoAnalysis } from "./repo-session";
export { PARSE_CACHE_FORMAT, ParseCache } from "./cache";
export type { CachedParse } from "./cache";
export {
  PARSE_CACHE_FILE,
  findScopePaths,
  loadOwnParseCache,
  loadScopeParseCaches,
  parseCachePath,
  serializeParseCache,
  writeParseCache,
  writeParseCachePayload
} from "./parse-cache-store";
export type { ParseCachePayload } from "./parse-cache-store";
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
export {
  DEFAULT_EXTENSIONS,
  walkCodeAndRest,
  walkProjectDirectories,
  walkSourceFiles
} from "./walk";
export type {
  SplitWalkResult,
  WalkedDirectory,
  WalkedFile,
  WalkOptions,
  WalkResult
} from "./walk";
export {
  buildRestSnapshot,
  isTextualPath,
  kindForPath,
  linkTargets,
  measureRestFile
} from "./rest";
export type { RestFile, RestInput } from "./rest";
export {
  REST_FILE,
  restSnapshotPath,
  writeRestSnapshot
} from "./rest-store";
export type { RestWrite } from "./rest-store";
export { ensureGitignoreEntry } from "./gitignore";
export {
  normalizeSourcePath,
  readSourceFile,
  readSourceSnippet,
  resolveSourceFile
} from "./source";
export { readFileDiff, type FileDiffView } from "./file-diff";
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
  ImportTargets,
  Metrics,
  ParsedImport,
  ParsedSymbol,
  SourceParser
} from "./types";
