import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import type { FileParseResult, SourceParser } from "../types";
import {
  collectImports,
  measureSource,
  usesTsxGrammar,
  type SyntaxNodeLike
} from "./measure";
import { collectSymbols } from "./symbols";

const EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"] as const;

/**
 * Parser TypeScript/JavaScript basado en tree-sitter nativo.
 *
 * Devuelve solo agregados por fichero. No retiene el árbol ni el fuente: el
 * análisis de un repositorio procesa un fichero cada vez.
 *
 * Las métricas se calculan en `measure.ts`, que es el mismo código que usa el
 * parser WASM del navegador: los números salen iguales en los dos.
 */
export class TypeScriptParser implements SourceParser {
  readonly name = "typescript";
  readonly extensions = EXTENSIONS;

  private readonly tsParser = new Parser();
  private readonly tsxParser = new Parser();

  constructor() {
    this.tsParser.setLanguage(TypeScript.typescript);
    this.tsxParser.setLanguage(TypeScript.tsx);
  }

  parse(source: string, filePath: string): FileParseResult {
    const parser = usesTsxGrammar(filePath) ? this.tsxParser : this.tsParser;
    // tree-sitter 0.21 usa un buffer de 32 KB por defecto y falla con
    // "Invalid argument" en ficheros mayores. Se dimensiona por contenido.
    const root = parser.parse(source, undefined, {
      bufferSize: Math.max(64 * 1024, Buffer.byteLength(source, "utf8") + 1)
    }).rootNode;
    const node = root as unknown as SyntaxNodeLike;
    return {
      metrics: measureSource(source, node),
      imports: collectImports(node),
      symbols: collectSymbols(node)
    };
  }
}
