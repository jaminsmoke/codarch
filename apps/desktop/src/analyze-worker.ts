import { analyzeRepository } from "@codarch/parsers";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  AnalyzeOutcome
} from "./analyze-protocol";

/**
 * El proceso que analiza.
 *
 * Electron lo arranca con `utilityProcess.fork` desde el proceso principal
 * (`analyzer.ts`). Analizar es CPU puro —parsear cientos de ficheros con
 * tree-sitter y esperar a git—, así que aquí no compite con el despacho de
 * clics, el menú ni el IPC: la app sigue respondiendo mientras trabaja.
 *
 * No dibuja nada y no toca `.codarch/`: recibe una raíz y devuelve el
 * snapshot. Escribirlo es cosa del proceso principal.
 */

/** El puerto que Electron inyecta en un `utilityProcess`. */
interface ParentPort {
  on(event: "message", listener: (event: { data: AnalyzeRequest }) => void): void;
  postMessage(value: AnalyzeResponse): void;
}

const parent = (process as unknown as { parentPort?: ParentPort }).parentPort;

if (!parent) {
  // Sin puerto no hay a quién contestar: mejor decirlo que quedarse callado.
  console.error("el proceso de análisis se lanzó sin parentPort");
} else {
  parent.on("message", (event) => {
    const request = event.data;
    parent.postMessage(analyze(request));
  });
}

/** Analiza y traduce el resultado (o el fallo) a un mensaje. */
export function analyze(request: AnalyzeRequest): AnalyzeResponse {
  try {
    const result = analyzeRepository(request.root, { git: true });
    const outcome: AnalyzeOutcome = {
      snapshot: result.snapshot,
      files: result.files,
      edges: result.edges,
      warnings: result.warnings
    };
    return { id: request.id, ok: true, result: outcome };
  } catch (cause) {
    return { id: request.id, ok: false, error: (cause as Error).message };
  }
}
