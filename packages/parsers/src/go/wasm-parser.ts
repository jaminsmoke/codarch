import Parser from "web-tree-sitter";
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
 * Parser Go en WASM, para el navegador.
 *
 * Usa la misma gramática que el CLI —el `.wasm` viene del paquete
 * `tree-sitter-go`— y el mismo recorrido, así que las métricas coinciden
 * fichero a fichero. El nombre lleva el sufijo `-wasm` para que la caché de
 * parseo no mezcle lo que midió un build con lo que midió el otro.
 */
export class WasmGoParser implements SourceParser {
  readonly name = "go-wasm";
  readonly extensions = EXTENSIONS;

  private readonly goParser: Parser;
  private module: string | null = null;

  private constructor(goParser: Parser) {
    this.goParser = goParser;
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
  ): Promise<WasmGoParser> {
    await Parser.init(
      options.runtime ? { locateFile: () => options.runtime } : undefined
    );
    const language = await Parser.Language.load(grammar);
    const goParser = new Parser();
    goParser.setLanguage(language);
    return new WasmGoParser(goParser);
  }

  /** El `go.mod` llega por el mismo puerto que en el CLI: el fichero en memoria. */
  prepare(project: ParserProject): void {
    this.module = readGoModule(project.readFile("go.mod"));
  }

  parse(source: string): FileParseResult {
    const root = this.goParser.parse(source).rootNode;
    return analyzeGoTree(source, root as unknown as SyntaxNodeLike);
  }

  importTargets(imported: ParsedImport): ImportTargets {
    return goImportTargets(imported.specifier, this.module);
  }
}
