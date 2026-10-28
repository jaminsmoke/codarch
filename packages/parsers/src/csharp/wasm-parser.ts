import Parser from "web-tree-sitter";
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
 * Parser C# en WASM, para el navegador.
 *
 * Usa la misma gramática que el CLI —el `.wasm` viene del paquete
 * `tree-sitter-c-sharp`— y el mismo recorrido, así que las métricas coinciden
 * fichero a fichero. El nombre lleva el sufijo `-wasm` para que la caché de
 * parseo no mezcle lo que midió un build con lo que midió el otro.
 */
export class WasmCSharpParser implements SourceParser {
  readonly name = "csharp-wasm";
  readonly extensions = EXTENSIONS;

  private readonly csharpParser: Parser;

  private constructor(csharpParser: Parser) {
    this.csharpParser = csharpParser;
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
  ): Promise<WasmCSharpParser> {
    await Parser.init(
      options.runtime ? { locateFile: () => options.runtime } : undefined
    );
    const language = await Parser.Language.load(grammar);
    const csharpParser = new Parser();
    csharpParser.setLanguage(language);
    return new WasmCSharpParser(csharpParser);
  }

  parse(source: string): FileParseResult {
    const root = this.csharpParser.parse(source).rootNode;
    return analyzeCSharpTree(source, root as unknown as SyntaxNodeLike);
  }

  /** Igual que en el CLI: el `using` nombra un espacio de nombres. */
  importTargets(imported: ParsedImport): ImportTargets {
    return csharpImportTargets(imported.specifier);
  }
}
