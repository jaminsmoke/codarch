import Parser from "web-tree-sitter";
import type { SyntaxNodeLike } from "../syntax";
import type { FileParseResult, ImportTargets, ParsedImport, SourceParser } from "../types";
import { analyzePythonTree } from "./analyze";
import { pythonImportTargets } from "./imports";

const EXTENSIONS = [".py"] as const;

/**
 * Parser Python en WASM, para el navegador.
 *
 * Usa la misma gramática que el CLI —el `.wasm` viene del paquete
 * `tree-sitter-python`— y el mismo recorrido, así que las métricas coinciden
 * fichero a fichero. El nombre lleva el sufijo `-wasm` para que la caché de
 * parseo no mezcle lo que midió un build con lo que midió el otro.
 */
export class WasmPythonParser implements SourceParser {
  readonly name = "python-wasm";
  readonly extensions = EXTENSIONS;

  private readonly pythonParser: Parser;

  private constructor(pythonParser: Parser) {
    this.pythonParser = pythonParser;
  }

  /**
   * `grammar` es la URL o los bytes del `.wasm` de la gramática; `runtime`, la
   * URL del wasm de web-tree-sitter, que en el navegador hay que indicar.
   *
   * `Parser.init` solo hace algo la primera vez: si otro parser ya lo llamó,
   * esto no vuelve a cargar el runtime.
   */
  static async create(
    grammar: string | Uint8Array,
    options: { runtime?: string } = {}
  ): Promise<WasmPythonParser> {
    await Parser.init(
      options.runtime ? { locateFile: () => options.runtime } : undefined
    );
    const language = await Parser.Language.load(grammar);
    const pythonParser = new Parser();
    pythonParser.setLanguage(language);
    return new WasmPythonParser(pythonParser);
  }

  parse(source: string): FileParseResult {
    const root = this.pythonParser.parse(source).rootNode;
    return analyzePythonTree(source, root as unknown as SyntaxNodeLike);
  }

  importTargets(imported: ParsedImport, filePath: string): ImportTargets {
    return pythonImportTargets(imported, filePath);
  }
}
