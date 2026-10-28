import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import type { SyntaxNodeLike } from "../syntax";
import type { FileParseResult, ImportTargets, ParsedImport, SourceParser } from "../types";
import { analyzePythonTree } from "./analyze";
import { pythonImportTargets } from "./imports";

const EXTENSIONS = [".py"] as const;

/**
 * La identidad del parser que guarda la caché de parseo (ADR 0089).
 *
 * Se exporta para que la caché se firme con el mismo nombre que declara el
 * parser, sin que las dos cadenas puedan separarse.
 */
export const PYTHON_PARSER_NAME = "python";

/**
 * Parser Python con la gramática nativa de tree-sitter.
 *
 * Métricas, importaciones, símbolos y miembros salen de `analyzePythonTree`, el
 * mismo código que usa el parser WASM: el navegador da los mismos números.
 */
export class PythonParser implements SourceParser {
  readonly name = PYTHON_PARSER_NAME;
  readonly extensions = EXTENSIONS;

  private readonly pythonParser = new Parser();

  constructor() {
    // El módulo entero, no `.language`: tree-sitter 0.25 necesita el
    // `nodeTypeInfo` de la gramática para materializar los nodos.
    this.pythonParser.setLanguage(Python);
  }

  parse(source: string): FileParseResult {
    const root = this.pythonParser.parse(source, undefined, {
      // tree-sitter 0.21 usa un buffer de 32 KB por defecto y falla con
      // "Invalid argument" en ficheros mayores.
      bufferSize: Math.max(64 * 1024, Buffer.byteLength(source, "utf8") + 1)
    }).rootNode;
    return analyzePythonTree(source, root as unknown as SyntaxNodeLike);
  }

  importTargets(imported: ParsedImport, filePath: string): ImportTargets {
    return pythonImportTargets(imported, filePath);
  }
}
