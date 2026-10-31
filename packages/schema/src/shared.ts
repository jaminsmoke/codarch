/**
 * La superficie del schema que comparten la entrada raíz y la del navegador.
 *
 * Todo lo de aquí es neutral respecto al entorno: tipos, árbol, identidad,
 * hash, estadísticas, cadenas e historial en memoria. Lo que toca `node:fs` se
 * queda en `index.ts` y el parser 2.x puro en `browser.ts`, pero la lista de
 * lo común no se escribe dos veces.
 */

export type {
  CcAttributeDescriptor,
  CcAttributeType,
  CcDependencyLens,
  CcDuplicatePair,
  CcDuplicationLens,
  CcDuplicationNode,
  CcDuplicationSummary,
  CcEdge,
  CcJson,
  CcLenses,
  CcMember,
  CcMeta,
  CcMetricsLens,
  CcMigrationEdge,
  CcMigrationLanguage,
  CcMigrationLanguageStats,
  CcMigrationLens,
  CcMigrationNode,
  CcMigrationStatus,
  CcMigrationSummary,
  CcNode,
  CcNodeType,
  CcRestKind,
  CcRestLens,
  CcRestNode,
  CcStructureLens,
  CcStructureNode,
  CcSurfaceExport,
  CcSurfaceImport,
  CcSymbol,
  CcSymbolsLens,
  CcSymbolsSummary,
  FileEntry
} from "./types";

export { CC_JSON_VERSION, CHAIN_LEDGER_VERSION } from "@codarch/versions";
export {
  CODARCH_DIR,
  CODARCH_ENTRIES,
  CODARCH_KNOWN,
  CONFIG_FILE_NAMES,
  HEAD_REPORT_FILE,
  LINT_FILE,
  LINT_RULES_FILE,
  PARSE_CACHE_FILE,
  PREFERENCES_FILE,
  REPORT_FILE,
  REST_FILE,
  SCOPES_FILE,
  SHOTS_DIR,
  SNAPSHOT_FILE,
  isCodarchEntry
} from "./artifacts";
export type { CodarchArtifact } from "./artifacts";
export { pathById, walkFiles, walkTree } from "./tree";
export type { CcStats, RankedFile } from "./stats";
export type { RankedSymbol } from "./stats";
export {
  defaultMetric,
  getStats,
  readSymbols,
  symbolRanking,
  symbolsOf,
  topByMetric
} from "./stats";
export { md5Hex, sha256Hex, stableStringify } from "./hash";
export {
  ID_LENGTH,
  canonicalPath,
  fileId,
  folderId,
  idFromCanonicalPath,
  nodeId,
  normalizeName,
  pathSegments
} from "./identity";
export {
  buildChains,
  findSymbolChains,
  summarizeChains,
  verifyChains
} from "./chains";
export type {
  ChainLevel,
  ChainStep,
  ChainVerification,
  ChainVersion,
  SymbolChain,
  SymbolEvent,
  SymbolHeat
} from "./chains";
export {
  HISTORY_VERSION,
  addHistoryEntry,
  emptyHistoryIndex,
  historyFileName,
  parseHistoryIndex
} from "./history";
export type { HistoryEntry, HistoryHotFile, HistoryIndex } from "./history";
