import Parser from "tree-sitter";
import Go from "tree-sitter-go";
import type { SyntaxNodeLike } from "../syntax";
import type {
  FileParseResult,
  ImportTargets,
  ParsedImport,
  ParserProject,
  SourceParser
} from "../types";
import { analyzeGoTree } from "./analyze";
import { goImportTargets, readGoModule } from "./imports";

const EXTENSIONS = [".go"] as const;

/**
 * La identidad del parser que guarda la caché de parseo (ADR 0089).
 *
 * Se exporta para que la caché se firme con el mismo nombre que declara el
 * parser, sin que las dos cadenas puedan separarse.
 */
export const GO_PARSER_NAME = "go";

/**
 * Parser Go con la gramática nativa de tree-sitter.
 *
 * Métricas, importaciones, símbolos y miembros salen de `analyzeGoTree`, el
 * mismo código que usa el parser WASM: el navegador da los mismos números.
 *
 * El `go.mod` se lee una vez por análisis, en `prepare`: sin él, un import se
 * resuelve por sufijo y no hay forma de saber si un paquete que falta es del
 * repositorio o de fuera.
 */
export class GoParser implements SourceParser {
  readonly name = GO_PARSER_NAME;
  readonly extensions = EXTENSIONS;

  private readonly goParser = new Parser();
  private module: string | null = null;

  constructor() {
    // El módulo entero, no `.language`: tree-sitter 0.25 necesita el
    // `nodeTypeInfo` de la gramática para materializar los nodos.
    this.goParser.setLanguage(Go);
  }

  prepare(project: ParserProject): void {
    this.module = readGoModule(project.readFile("go.mod"));
  }

  parse(source: string): FileParseResult {
    const root = this.goParser.parse(source, undefined, {
      // tree-sitter 0.21 usa un buffer de 32 KB por defecto y falla con
      // "Invalid argument" en ficheros mayores.
      bufferSize: Math.max(64 * 1024, Buffer.byteLength(source, "utf8") + 1)
    }).rootNode;
    return analyzeGoTree(source, root as unknown as SyntaxNodeLike);
  }

  importTargets(imported: ParsedImport): ImportTargets {
    return goImportTargets(imported.specifier, this.module);
  }
}
