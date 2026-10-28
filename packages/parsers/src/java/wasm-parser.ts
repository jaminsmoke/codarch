import Parser from "web-tree-sitter";
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
 * Parser Java en WASM, para el navegador.
 *
 * Usa la misma gramática que el CLI —el `.wasm` viene del paquete
 * `tree-sitter-java`— y el mismo recorrido, así que las métricas coinciden
 * fichero a fichero. El nombre lleva el sufijo `-wasm` para que la caché de
 * parseo no mezcle lo que midió un build con lo que midió el otro.
 */
export class WasmJavaParser implements SourceParser {
  readonly name = "java-wasm";
  readonly extensions = EXTENSIONS;

  private readonly javaParser: Parser;

  private constructor(javaParser: Parser) {
    this.javaParser = javaParser;
  }

  /**
   * `grammar` es la URL o los bytes del `.wasm` de la gramática; `runtime`, la
   * URL del wasm de web-tree-sitter, que en el navegador hay que indicar.
   *
   * `Parser.init` solo hace algo la primera vez: si el parser de TS ya lo
   * llamó, esto no vuelve a cargar el runtime.
   */
  static async create(
    grammar: string | Uint8Array,
    options: { runtime?: string } = {}
  ): Promise<WasmJavaParser> {
    await Parser.init(
      options.runtime ? { locateFile: () => options.runtime } : undefined
    );
    const language = await Parser.Language.load(grammar);
    const javaParser = new Parser();
    javaParser.setLanguage(language);
    return new WasmJavaParser(javaParser);
  }

  parse(source: string): FileParseResult {
    const root = this.javaParser.parse(source).rootNode;
    return analyzeJavaTree(source, root as unknown as SyntaxNodeLike);
  }

  /** Java no necesita la ruta del fichero: el import ya la nombra entera. */
  importTargets(imported: ParsedImport): ImportTargets {
    return javaImportTargets(imported.specifier);
  }
}
