import fs from "node:fs";
import path from "node:path";
import { parseCcJson, type CcJson } from "@codarch/schema";
import { REPORT_SCHEMA_VERSION, parseReport, type DiffReport } from "@codarch/metrics";
import { McpDataError } from "./store-types";

/** Un reporte ya cargado, con la ruta de la que salió. */
export interface LoadedReport {
  path: string;
  report: DiffReport;
}

/** El snapshot del repo, o el error que dice qué falta y qué hacer. */
export function loadSnapshot(file: string): CcJson {
  if (!fs.existsSync(file)) {
    throw new McpDataError(
      `no encuentro el snapshot ${file}. Ejecuta "codarch analyze ." o pasa --snapshot.`
    );
  }

  const raw = readJson(file);
  try {
    return parseCcJson(raw);
  } catch (error) {
    throw new McpDataError(
      `snapshot inválido en ${file}: ${(error as Error).message}`
    );
  }
}

/**
 * El reporte que se pidió por ruta.
 *
 * `null` lo apaga; una ruta que no está es un error en vez de un «no hay»: el
 * que la pidió sabe dónde debería estar.
 */
export function explicitReport(
  root: string,
  option: string | null,
  label: string
): LoadedReport | null {
  if (option === null) return null;

  const file = path.resolve(root, option);
  if (!fs.existsSync(file)) {
    throw new McpDataError(`no encuentro el ${label} ${file}`);
  }

  return { path: file, report: parseDiffReport(readJson(file), file) };
}

/** El JSON del fichero, o el error de lectura con su ruta. */
function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
  } catch (error) {
    throw new McpDataError(
      `no se pudo leer ${file}: ${(error as Error).message}`
    );
  }
}

function parseDiffReport(input: unknown, source: string): DiffReport {
  // El lector es el del paquete de métricas: un reporte de una versión
  // anterior se reconstruye a la actual.
  const report = parseReport(input);
  if (!report) {
    throw new McpDataError(
      `reporte inválido en ${source}: no parece un reporte CodArch (schemaVersion ${REPORT_SCHEMA_VERSION})`
    );
  }
  return report;
}
