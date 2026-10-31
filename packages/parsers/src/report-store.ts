import fs from "node:fs";
import path from "node:path";
import { parseReport, type DiffReport } from "@codarch/metrics";
import { HEAD_REPORT_FILE, REPORT_FILE, codarchDir } from "@codarch/schema";

/**
 * Los dos reportes de un proyecto y cuál se enseña (ADR 0072, ADR 0101).
 *
 * El reporte es el mismo documento —un `DiffReport`— en dos sitios, y por eso
 * los dos tenían su lector repartido por cinco consumidores. Aquí queda escrito
 * una vez qué es cada uno, quién lo escribe y cuál manda:
 *
 * - `report.json`, el **guardado**: la comparación de un par base/head, tal
 *   como la guardó quien abrió ese reporte.
 * - `head-report.json`, el del **árbol de trabajo**: lo que hay ahora contra el
 *   último commit. Lo reescribe el escritorio en cada pasada.
 *
 * Manda el del árbol de trabajo: es el que habla del código que se está
 * mirando. `report.json` es el respaldo cuando no lo hay.
 */

/** Qué compara un reporte guardado. */
export type StoredReportKind = "worktree" | "artifact";

export interface StoredReport {
  kind: StoredReportKind;
  report: DiffReport;
  /** De dónde se leyó, para poder decirlo. */
  path: string;
}

/** El fichero de cada reporte: el nombre sale del registro de `.codarch/`. */
export function reportFilePath(root: string, kind: StoredReportKind): string {
  return path.join(
    codarchDir(root),
    kind === "worktree" ? HEAD_REPORT_FILE : REPORT_FILE
  );
}

/**
 * El reporte de ese tipo, o `null` si falta o no se entiende.
 *
 * Un fichero de otra versión o escrito a mano deja al que lo pide sin reporte:
 * nunca se completa con una lista plausible.
 */
export function readStoredReport(
  root: string,
  kind: StoredReportKind
): StoredReport | null {
  const file = reportFilePath(root, kind);
  try {
    const report = parseReport(JSON.parse(fs.readFileSync(file, "utf8")) as unknown);
    return report ? { kind, report, path: file } : null;
  } catch {
    return null;
  }
}

/** Escribe el reporte de ese tipo y devuelve la ruta donde quedó. */
export function writeStoredReport(
  root: string,
  kind: StoredReportKind,
  report: unknown
): string {
  const file = reportFilePath(root, kind);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return file;
}

/** El reporte que manda: el del árbol de trabajo, y si no hay, el guardado. */
export function preferredReport(root: string): StoredReport | null {
  return readStoredReport(root, "worktree") ?? readStoredReport(root, "artifact");
}
