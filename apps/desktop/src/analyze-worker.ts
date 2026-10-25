import { diffSnapshots, loadProjectIgnore, type DiffReport } from "@codarch/metrics";
import { AnalysisSession, compareWorkingTreeWithHead } from "@codarch/parsers";
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

/**
 * Lo tocado desde el último commit (HEAD contra el working tree).
 *
 * Si el repo no tiene commits o el export falla, devuelve `null` y avisa: el
 * análisis normal sigue.
 */
function headReportFor(root: string, warnings: string[]): DiffReport | null {
  try {
    const pair = compareWorkingTreeWithHead(root);
    if (!pair) return null;
    return diffSnapshots(pair.base, pair.head);
  } catch (cause) {
    warnings.push(
      `no se pudo comparar con el último commit: ${(cause as Error).message}`
    );
    return null;
  }
}

/**
 * El último reporte HEAD de cada raíz (ADR 0072).
 *
 * `refresh` contesta `unchanged` cuando el pulso no trae nada nuevo, y entonces
 * el HEAD tampoco ha cambiado: se reutiliza en vez de rehacer el export. Se
 * renueva en cada análisis real, así que nunca queda más viejo que el último
 * cambio que el pulso vio.
 */
const headReports = new Map<string, DiffReport | null>();

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
    if (!result) {
      // Nada nuevo: el HEAD sigue igual. Se devuelve el último, para que la
      // pestaña Cambios no se quede con un reporte viejo.
      return {
        id: request.id,
        ok: true,
        result: { kind: "unchanged", headReport: headReports.get(request.root) ?? null }
      };
    }

    // El reporte va antes que los avisos: si el HEAD falla, su aviso también sale.
    const headReport = headReportFor(request.root, warnings);
    headReports.set(request.root, headReport);
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
