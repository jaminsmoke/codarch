/**
 * Entrada para el navegador.
 *
 * No importa `node:fs` ni el binding nativo de tree-sitter: aquí solo vive el
 * parser WASM y las piezas puras del análisis. El CLI usa la entrada normal.
 */
export { WasmTypeScriptParser } from "./ts/wasm-parser";
export {
  collectImports,
  countLines,
  measureSource,
  usesTsxGrammar,
  type SyntaxNodeLike
} from "./ts/measure";
export type {
  FileParseResult,
  ImportKind,
  Metrics,
  ParsedImport,
  ParsedSymbol,
  SourceParser
} from "./types";
export { DEFAULT_EXTENSIONS } from "./extensions";
