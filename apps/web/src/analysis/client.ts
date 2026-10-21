import type { AnalyzeRequest, AnalyzeResponse } from "./run";

/**
 * Cliente del worker de análisis.
 *
 * La app no habla con el worker directamente: este módulo lo envuelve en una
 * promesa y traduce los mensajes. Además expone `cancel`: el análisis es
 * síncrono dentro del worker, así que la única forma de cortarlo en el
 * momento es terminarlo.
 */

export interface BrowserAnalysis {
  snapshot: unknown;
  files: number;
  edges: number;
  warnings: string[];
  durationMs: number;
}

export interface AnalyzeInBrowserOptions {
  /** Rutas y contenido de los ficheros del repositorio. */
  files: Array<[string, string]>;
  projectName?: string;
  /** Mensaje de fase ("Cargando el parser…"). */
  onProgress?: (message: string) => void;
  /** Progreso fichero a fichero. */
  onFileProgress?: (progress: { done: number; total: number; current: string }) => void;
}

export interface AnalysisHandle {
  result: Promise<BrowserAnalysis>;
  /** Corta el análisis. El worker muere y la promesa se rechaza. */
  cancel: () => void;
}

export class AnalysisCancelled extends Error {
  constructor() {
    super("Análisis cancelado");
    this.name = "AnalysisCancelled";
  }
}

export function analyzeInBrowser(
  options: AnalyzeInBrowserOptions
): AnalysisHandle {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module"
  });

  let cancelled = false;
  let rejectResult: (reason: Error) => void = () => undefined;

  const result = new Promise<BrowserAnalysis>((resolve, reject) => {
    rejectResult = reject;
    const finish = (): void => {
      worker.terminate();
    };

    worker.addEventListener("message", (event: MessageEvent<AnalyzeResponse>) => {
      const message = event.data;
      if (message.type === "progress") {
        options.onProgress?.(message.message);
        return;
      }
      if (message.type === "progress-file") {
        options.onFileProgress?.({
          done: message.done,
          total: message.total,
          current: message.current
        });
        return;
      }
      if (message.type === "error") {
        finish();
        reject(new Error(message.message));
        return;
      }
      if (message.type === "done") {
        finish();
        resolve({
          snapshot: message.snapshot,
          files: message.files,
          edges: message.edges,
          warnings: message.warnings,
          durationMs: message.durationMs
        });
      }
    });

    worker.addEventListener("error", (event) => {
      finish();
      reject(new Error(event.message || "el worker de análisis falló"));
    });

    const request: AnalyzeRequest = {
      type: "analyze",
      files: options.files,
      projectName: options.projectName
    };
    worker.postMessage(request);
  });

  return {
    result,
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      // El análisis es síncrono dentro del worker: la única forma de cortarlo
      // en el momento es terminar el proceso.
      worker.terminate();
      rejectResult(new AnalysisCancelled());
    }
  };
}
