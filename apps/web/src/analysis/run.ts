import {
  MemoryFileSystem,
  WasmTypeScriptParser,
  analyzeFiles
} from "@codarch/parsers/browser";

/**
 * Análisis en el navegador, sin depender del worker.
 *
 * El worker solo reparte mensajes; la lógica vive aquí para poder probarla
 * en Node, donde la gramática se lee del disco en vez de la red.
 */

export interface AnalyzeRequest {
  type: "analyze";
  files: Array<[string, string]>;
  projectName?: string;
}

export type AnalyzeResponse =
  | { type: "ready" }
  | { type: "progress"; message: string }
  | {
      type: "done";
      snapshot: unknown;
      files: number;
      edges: number;
      warnings: string[];
      durationMs: number;
    }
  | { type: "error"; message: string };

/** De dónde se sacan las gramáticas y el runtime. */
export interface GrammarSources {
  typescript: string | Uint8Array;
  tsx: string | Uint8Array;
  runtime?: string;
}

export async function runAnalysis(
  request: AnalyzeRequest,
  sources: GrammarSources
): Promise<AnalyzeResponse> {
  try {
    const parser = await WasmTypeScriptParser.create(
      sources.typescript,
      sources.tsx,
      { runtime: sources.runtime }
    );

    const started = Date.now();
    const result = analyzeFiles({
      fileSystem: new MemoryFileSystem(request.files),
      root: "/",
      projectName: request.projectName,
      parser
    });

    return {
      type: "done",
      snapshot: result.snapshot,
      files: result.files,
      edges: result.edges,
      warnings: result.warnings,
      durationMs: Date.now() - started
    };
  } catch (cause) {
    return {
      type: "error",
      message: (cause as Error).message ?? String(cause)
    };
  }
}
