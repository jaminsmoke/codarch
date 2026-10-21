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
  CcNode,
  CcNodeType,
  CcSymbol,
  CcSymbolsLens,
  CcSymbolsSummary,
  FileEntry
} from "./types";

export { buildChains } from "./chains";
export type {
  ChainStep,
  ChainVersion,
  SymbolChain,
  SymbolEvent
} from "./chains";
export {
  CHAINS_FILE,
  chainLedgerPath,
  emptyLedger,
  ledgerIsFresh,
  readChainLedger,
  writeChainLedger
} from "./chain-store";
export type { ChainLedger } from "./chain-store";
export { CcJsonError, parseCcJson } from "./parse";
export { isLegacyCcJson, normalizeLegacyCcJson } from "./legacy";
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
export { md5Hex, sha256Hex } from "./hash";
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
export {
  HISTORY_DIR,
  HISTORY_INDEX,
  historyLocation,
  readHistoryIndex,
  saveHistory,
  summarizeSnapshot
} from "./history-store";
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
