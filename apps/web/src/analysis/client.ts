import type { AnalyzeRequest, AnalyzeResponse } from "./run";

/**
 * Cliente del worker de análisis.
 *
 * La app no habla con el worker directamente: este módulo lo envuelve en una
 * promesa y traduce los mensajes.
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
  onProgress?: (message: string) => void;
}

export function analyzeInBrowser(
  options: AnalyzeInBrowserOptions
): Promise<BrowserAnalysis> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module"
    });

    const finish = (): void => {
      worker.terminate();
    };

    worker.addEventListener("message", (event: MessageEvent<AnalyzeResponse>) => {
      const message = event.data;
      if (message.type === "progress") {
        options.onProgress?.(message.message);
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
}
