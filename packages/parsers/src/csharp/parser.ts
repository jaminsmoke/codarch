import Parser from "tree-sitter";
import CSharp from "tree-sitter-c-sharp";
import type { SyntaxNodeLike } from "../syntax";
import type {
  FileParseResult,
  ImportTargets,
  ParsedImport,
  SourceParser
} from "../types";
import { analyzeCSharpTree } from "./analyze";
import { csharpImportTargets } from "./imports";

const EXTENSIONS = [".cs"] as const;

/**
 * La identidad del parser que guarda la caché de parseo (ADR 0089).
 *
 * Se exporta para que la caché se firme con el mismo nombre que declara el
 * parser, sin que las dos cadenas puedan separarse.
 */
export const CSHARP_PARSER_NAME = "csharp";

/**
 * Parser C# con la gramática nativa de tree-sitter.
 *
 * Métricas, importaciones, símbolos y miembros salen de `analyzeCSharpTree`,
 * el mismo código que usa el parser WASM: el navegador da los mismos números.
 *
 * Lo que este parser no puede hacer solo es resolver un `using`: el espacio de
 * nombres que nombra no está en la ruta del fichero, está en lo que declaran los
 * demás. Devuelve qué buscar y el análisis lo cierra al final (ADR 0090).
 */
export class CSharpParser implements SourceParser {
  readonly name = CSHARP_PARSER_NAME;
  readonly extensions = EXTENSIONS;

  private readonly csharpParser = new Parser();

  constructor() {
    // El módulo entero, no `.language`: tree-sitter 0.25 necesita el
    // `nodeTypeInfo` de la gramática para materializar los nodos.
    this.csharpParser.setLanguage(CSharp);
  }

  parse(source: string): FileParseResult {
    const root = this.csharpParser.parse(source, undefined, {
      // tree-sitter 0.21 usa un buffer de 32 KB por defecto y falla con
      // "Invalid argument" en ficheros mayores.
      bufferSize: Math.max(64 * 1024, Buffer.byteLength(source, "utf8") + 1)
    }).rootNode;
    return analyzeCSharpTree(source, root as unknown as SyntaxNodeLike);
  }

  /** El `using` nombra un espacio de nombres, no una ruta ni un fichero. */
  importTargets(imported: ParsedImport): ImportTargets {
    return csharpImportTargets(imported.specifier);
  }
}
