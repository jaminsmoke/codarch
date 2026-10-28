import Parser from "tree-sitter";
import Java from "tree-sitter-java";
import type { SyntaxNodeLike } from "../syntax";
import type {
  FileParseResult,
  ImportTargets,
  ParsedImport,
  SourceParser
} from "../types";
import { analyzeJavaTree } from "./analyze";
import { javaImportTargets } from "./imports";

const EXTENSIONS = [".java"] as const;

/**
 * La identidad del parser que guarda la caché de parseo (ADR 0089).
 *
 * Se exporta para que la caché se firme con el mismo nombre que declara el
 * parser, sin que las dos cadenas puedan separarse.
 */
export const JAVA_PARSER_NAME = "java";

/**
 * Parser Java con la gramática nativa de tree-sitter.
 *
 * Métricas, importaciones, símbolos y miembros salen de `analyzeJavaTree`, el
 * mismo código que usa el parser WASM: el navegador da los mismos números.
 */
export class JavaParser implements SourceParser {
  readonly name = JAVA_PARSER_NAME;
  readonly extensions = EXTENSIONS;

  private readonly javaParser = new Parser();

  constructor() {
    // El módulo entero, no `.language`: tree-sitter 0.25 necesita el
    // `nodeTypeInfo` de la gramática para materializar los nodos.
    this.javaParser.setLanguage(Java);
  }

  parse(source: string): FileParseResult {
    const root = this.javaParser.parse(source, undefined, {
      // tree-sitter 0.21 usa un buffer de 32 KB por defecto y falla con
      // "Invalid argument" en ficheros mayores.
      bufferSize: Math.max(64 * 1024, Buffer.byteLength(source, "utf8") + 1)
    }).rootNode;
    return analyzeJavaTree(source, root as unknown as SyntaxNodeLike);
  }

  /** Java no necesita la ruta del fichero: el import ya la nombra entera. */
  importTargets(imported: ParsedImport): ImportTargets {
    return javaImportTargets(imported.specifier);
  }
}
