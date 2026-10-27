import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import type { FileParseResult, SourceParser } from "../types";
import { usesTsxGrammar, type SyntaxNodeLike } from "./measure";
import { analyzeTree } from "./tree";

const EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"] as const;

/**
 * La identidad del parser que guarda la caché de parseo (ADR 0089).
 *
 * Un alcance no reutiliza el parseo de otro parser: el mismo fuente puede dar
 * otros números. Se exporta para que la caché se firme con el mismo nombre que
 * declara el parser, sin que las dos cadenas puedan separarse.
 */
export const TS_PARSER_NAME = "typescript";

/**
 * Parser TypeScript/JavaScript basado en tree-sitter nativo.
 *
 * Devuelve solo agregados por fichero. No retiene el árbol ni el fuente: el
 * análisis de un repositorio procesa un fichero cada vez.
 *
 * Métricas, importaciones y símbolos salen de `analyzeTree`, que recorre el
 * árbol una sola vez y es el mismo código que usa el parser WASM: los números
 * salen iguales en los dos.
 */
export class TypeScriptParser implements SourceParser {
  readonly name = TS_PARSER_NAME;
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
    return analyzeTree(source, root as unknown as SyntaxNodeLike);
  }
}
