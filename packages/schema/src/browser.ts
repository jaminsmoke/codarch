/**
 * Entrada browser-safe del schema.
 *
 * No exporta `history-store` ni `chain-store`: esos módulos usan `node:fs` y
 * `node:path`. El parser compartido importa esta entrada para que el bundle del
 * navegador no arrastre código de Node; la entrada raíz sigue teniendo los
 * almacenes para CLI, MCP y escritorio.
 */

export type {
  CcAttributeDescriptor,
  CcAttributeType,
  CcDependencyLens,
  CcEdge,
  CcJson,
  CcLenses,
  CcMeta,
  CcMetricsLens,
  CcMigrationEdge,
  CcMigrationLanguage,
  CcMigrationLanguageStats,
  CcMigrationLens,
  CcMigrationNode,
  CcMigrationStatus,
  CcMigrationSummary,
  CcMember,
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

export {
  CC_JSON_VERSION,
  CHAIN_LEDGER_VERSION
} from "@codarch/versions";
export { CcJsonError } from "./errors";
export { parseCcJson2 as parseCcJson } from "./parse2";
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
export { buildChains, findSymbolChains, summarizeChains, verifyChains } from "./chains";
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
export type {
  HistoryEntry,
  HistoryHotFile,
  HistoryIndex
} from "./history";
