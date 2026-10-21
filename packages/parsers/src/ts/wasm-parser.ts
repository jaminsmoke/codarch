import Parser from "web-tree-sitter";
import type { FileParseResult, SourceParser } from "../types";
import { collectImports, measureSource, usesTsxGrammar, type SyntaxNodeLike } from "./measure";

const EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"] as const;

/**
 * Parser TypeScript/JavaScript en WASM, para el navegador.
 *
 * Usa las mismas gramáticas que el CLI: los `.wasm` vienen del paquete
 * `tree-sitter-typescript` en la misma versión que el binding nativo, así que
 * las métricas coinciden fichero a fichero.
 */
export class WasmTypeScriptParser implements SourceParser {
  readonly name = "typescript-wasm";
  readonly extensions = EXTENSIONS;

  private readonly tsParser: Parser;
  private readonly tsxParser: Parser;

  private constructor(tsParser: Parser, tsxParser: Parser) {
    this.tsParser = tsParser;
    this.tsxParser = tsxParser;
  }

  /**
   * Prepara el runtime y las dos gramáticas.
   *
   * `typescript` y `tsx` son las URLs de los `.wasm`; en el navegador se
   * importan como assets y en Node se leen del disco. `runtime` es la URL del
   * wasm de web-tree-sitter, que en el navegador hay que indicar a mano.
   */
  static async create(
    typescript: string | Uint8Array,
    tsx: string | Uint8Array,
    options: { runtime?: string } = {}
  ): Promise<WasmTypeScriptParser> {
    await Parser.init(
      options.runtime ? { locateFile: () => options.runtime } : undefined
    );
    const tsLanguage = await Parser.Language.load(typescript);
    const tsxLanguage = await Parser.Language.load(tsx);

    const tsParser = new Parser();
    tsParser.setLanguage(tsLanguage);
    const tsxParser = new Parser();
    tsxParser.setLanguage(tsxLanguage);
    return new WasmTypeScriptParser(tsParser, tsxParser);
  }

  parse(source: string, filePath: string): FileParseResult {
    const parser = usesTsxGrammar(filePath) ? this.tsxParser : this.tsParser;
    const root = parser.parse(source).rootNode;
    const node = root as unknown as SyntaxNodeLike;
    return {
      metrics: measureSource(source, node),
      imports: collectImports(node)
    };
  }
}
