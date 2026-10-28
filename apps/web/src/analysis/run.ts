import {
  MemoryFileSystem,
  WasmJavaParser,
  WasmPythonParser,
  WasmTypeScriptParser,
  analyzeFiles,
  type SourceParser
} from "@codarch/parsers/browser";
import { parseIgnoreYaml } from "@codarch/metrics/browser";

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
      type: "progress-file";
      done: number;
      total: number;
      current: string;
    }
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
  java?: string | Uint8Array;
  python?: string | Uint8Array;
  runtime?: string;
}

/** Avisa del progreso sin lanzar exceptions: un fallo aquí no debe tumbar el análisis. */
export type ProgressReporter = (response: AnalyzeResponse) => void;

export async function runAnalysis(
  request: AnalyzeRequest,
  sources: GrammarSources,
  report: ProgressReporter = () => undefined
): Promise<AnalyzeResponse> {
  try {
    const parser = await WasmTypeScriptParser.create(
      sources.typescript,
      sources.tsx,
      { runtime: sources.runtime }
    );
    const parsers: SourceParser[] = [parser];
    if (sources.java) {
      parsers.push(
        await WasmJavaParser.create(sources.java, { runtime: sources.runtime })
      );
    }
    if (sources.python) {
      parsers.push(
        await WasmPythonParser.create(sources.python, {
          runtime: sources.runtime
        })
      );
    }

    const started = Date.now();
    // El navegador comparte el alcance del CLI (ADR 0038): si el repo trae
    // `.codarch.yml`, sus patrones `ignore` se aplican antes de recorrer.
    const config = request.files.find(([file]) =>
      /^\/?\.codarch\.ya?ml$/.test(file)
    );
    const ignore = config ? parseIgnoreYaml(config[1]) : [];
    const result = analyzeFiles({
      fileSystem: new MemoryFileSystem(request.files),
      root: "/",
      projectName: request.projectName,
      ignore,
      parsers,
      onProgress: (progress) => report({ type: "progress-file", ...progress })
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
