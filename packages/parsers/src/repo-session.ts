import { loadProjectIgnore, type DiffReport } from "@codarch/metrics";
import type { CcJson } from "@codarch/schema";
import { compareWorkingTreeWithHead } from "./head-diff";
import { AnalysisSession } from "./session";

/**
 * El flujo de analizar un repositorio (ADR 0074).
 *
 * Lo que `serve` y el proceso de análisis del escritorio hacían por su cuenta:
 * releer el alcance del repo, analizar solo si el pulso trae algo nuevo, y
 * comparar el working tree con su último commit. Vive aquí para que un cambio
 * de comportamiento se haga una vez y llegue a las dos plataformas.
 */

/** Las sesiones vivas, una por raíz y proceso (ADR 0056). */
const sessions = new Map<string, AnalysisSession>();

export function repoSession(root: string): AnalysisSession {
  let session = sessions.get(root);
  if (!session) {
    session = new AnalysisSession(root, { git: true });
    sessions.set(root, session);
  }
  return session;
}

export interface AnalyzeRepoOptions {
  /** Pistas del vigilante: si nada de esto cambió, no se analiza. */
  hints?: readonly string[];
  /** Analiza aunque el pulso no traiga nada nuevo. */
  force?: boolean;
}

export type RepoAnalysis =
  | { kind: "unchanged" }
  | {
      kind: "snapshot";
      snapshot: CcJson;
      files: number;
      edges: number;
      warnings: string[];
    };

/**
 * Analiza el repo, o contesta que no hay nada nuevo.
 *
 * El alcance se relee en cada pasada: guardar `.codarch.yml` también refresca
 * el mapa (ADR 0038). Un análisis nuevo tira el reporte HEAD de esa raíz, que
 * ya no describe el árbol.
 */
export function analyzeRepo(
  root: string,
  options: AnalyzeRepoOptions = {}
): RepoAnalysis {
  const warnings: string[] = [];
  let ignore: string[] = [];
  try {
    ignore = loadProjectIgnore(root);
  } catch (cause) {
    warnings.push(`no se pudo leer .codarch.yml: ${(cause as Error).message}`);
  }

  const session = repoSession(root);
  const hints = options.hints ?? [];
  const sessionOptions = { git: true, ignore };
  const result = options.force
    ? session.analyze(hints, sessionOptions)
    : session.refresh(hints, sessionOptions);
  if (!result) return { kind: "unchanged" };

  forgetHeadReport(root);
  return {
    kind: "snapshot",
    snapshot: result.snapshot,
    files: result.files,
    edges: result.edges,
    warnings: [...warnings, ...result.warnings]
  };
}

interface HeadEntry {
  report: DiffReport | null;
  /** Por qué no hay reporte, si falló. Se repite en cada consulta. */
  error: string | null;
}

/** El último reporte HEAD de cada raíz; se calcula una vez (ADR 0072). */
const headReports = new Map<string, HeadEntry>();

/**
 * Lo tocado desde el último commit: el working tree contra su HEAD.
 *
 * Cuesta segundos —un `git archive` y dos análisis—, así que se guarda por raíz
 * hasta que haya un análisis nuevo. Devuelve `null` si el repo no tiene commits
 * o el export falla; el motivo se suma a `warnings`.
 */
export function headReportFor(
  root: string,
  warnings: string[] = []
): DiffReport | null {
  let entry = headReports.get(root);
  if (!entry) {
    try {
      // El mismo alcance que el análisis: si el mapa no lo cuenta, el reporte
      // tampoco (ADR 0038).
      let ignore: string[] = [];
      try {
        ignore = loadProjectIgnore(root);
      } catch {
        // Sin alcance legible se compara el árbol entero; el aviso ya lo dio
        // el análisis.
      }
      // El reporte lo trae la propia comparación: medir las líneas de cada
      // símbolo necesita las dos fuentes, y la base solo vive ahí (ADR 0074).
      const pair = compareWorkingTreeWithHead(root, { ignore });
      entry = { report: pair ? pair.report : null, error: null };
    } catch (cause) {
      entry = {
        report: null,
        error: `no se pudo comparar con el último commit: ${(cause as Error).message}`
      };
    }
    headReports.set(root, entry);
  }
  if (entry.error) warnings.push(entry.error);
  return entry.report;
}

/** Tira el reporte guardado: el árbol cambió y el anterior ya no sirve. */
export function forgetHeadReport(root: string): void {
  headReports.delete(root);
}
