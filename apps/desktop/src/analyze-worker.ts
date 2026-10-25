import { analyzeRepo, headReportFor } from "@codarch/parsers";
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
 *
 * El flujo —sesión, alcance del `.codarch.yml`, comparación con el último
 * commit y sus avisos— es el mismo que usa `codarch serve` (ADR 0074).
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
    const warnings: string[] = [];
    const result = analyzeRepo(request.root, {
      force: request.force,
      hints: request.hints ?? []
    });

    // El reporte va antes que los avisos: si el HEAD falla, su aviso también sale.
    const headReport = headReportFor(request.root, warnings);

    if (result.kind === "unchanged") {
      // Nada nuevo: el HEAD sigue igual. Se devuelve el último, para que la
      // pestaña Cambios no se quede con un reporte viejo (ADR 0072).
      return {
        id: request.id,
        ok: true,
        result: { kind: "unchanged", headReport }
      };
    }

    const outcome: AnalyzeOutcome = {
      kind: "snapshot",
      snapshot: result.snapshot,
      files: result.files,
      edges: result.edges,
      warnings: [...warnings, ...result.warnings],
      headReport
    };
    return { id: request.id, ok: true, result: outcome };
  } catch (cause) {
    return { id: request.id, ok: false, error: (cause as Error).message };
  }
}
