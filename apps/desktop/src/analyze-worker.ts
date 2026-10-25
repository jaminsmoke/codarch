import { loadProjectIgnore } from "@codarch/metrics";
import { AnalysisSession } from "@codarch/parsers";
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

/**
 * La sesión de cada raíz.
 *
 * El proceso vive mientras vive la app, así que guardar aquí el parseo y el
 * churn es lo que hace que un guardado cueste ~100 ms en vez de ~2 800
 * (ADR 0056). Y la sesión, además, sabe si el pulso traía algo nuevo: si no,
 * contesta sin tocar el disco.
 */
const sessions = new Map<string, AnalysisSession>();

function sessionFor(root: string): AnalysisSession {
  let session = sessions.get(root);
  if (!session) {
    session = new AnalysisSession(root, { git: true });
    sessions.set(root, session);
  }
  return session;
}

/** Analiza y traduce el resultado (o el fallo) a un mensaje. */
export function analyze(request: AnalyzeRequest): AnalyzeResponse {
  try {
    const session = sessionFor(request.root);
    // El alcance que declara el repo (ADR 0038): sin esto el escritorio
    // analizaría ficheros que el CLI y `serve` excluyen, y su checksum no
    // cuadraría con el suyo.
    const warnings: string[] = [];
    let ignore: string[] = [];
    try {
      ignore = loadProjectIgnore(request.root);
    } catch (cause) {
      warnings.push(
        `no se pudo leer .codarch.yml: ${(cause as Error).message}`
      );
    }

    const options = { git: true, ignore };
    const hints = request.hints ?? [];
    const result = request.force
      ? session.analyze(hints, options)
      : session.refresh(hints, options);
    if (!result) return { id: request.id, ok: true, result: { kind: "unchanged" } };

    const outcome: AnalyzeOutcome = {
      kind: "snapshot",
      snapshot: result.snapshot,
      files: result.files,
      edges: result.edges,
      warnings: [...warnings, ...result.warnings]
    };
    return { id: request.id, ok: true, result: outcome };
  } catch (cause) {
    return { id: request.id, ok: false, error: (cause as Error).message };
  }
}
