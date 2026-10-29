/**
 * Entrada para el navegador.
 *
 * No importa `node:fs`, ni el binding nativo de tree-sitter, ni git: aquí
 * viven el parser WASM, el sistema de ficheros en memoria y el núcleo del
 * análisis. El CLI usa la entrada normal.
 */
export { WasmTypeScriptParser } from "./ts/wasm-parser";
export { WasmJavaParser } from "./java/wasm-parser";
export { WasmPythonParser } from "./python/wasm-parser";
export { WasmGoParser } from "./go/wasm-parser";
export { WasmCSharpParser } from "./csharp/wasm-parser";
export {
  collectImports,
  countLines,
  measureSource,
  usesTsxGrammar,
  type SyntaxNodeLike
} from "./ts/measure";
export { analyzeFiles } from "./analyze-core";
export { extensionsFor, parserFor } from "./parsers";
export type {
  AnalyzeCoreOptions,
  AnalyzeCoreResult,
  ChurnMetric,
  ChurnResult,
  UnresolvedImportIssue
} from "./analyze-core";
export { MemoryFileSystem, directoryOf } from "./fs";
export type { DirectoryEntry, FileSystem } from "./fs";
export { walkCodeAndRest, walkSourceFiles } from "./walk";
export type {
  SplitWalkResult,
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
export { DEFAULT_EXTENSIONS } from "./extensions";
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
