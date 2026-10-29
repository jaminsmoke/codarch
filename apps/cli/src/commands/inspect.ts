import {
  CcJsonError,
  defaultMetric,
  getStats,
  parseCcJson,
  topByMetric,
  type CcJson,
  type CcStats
} from "@codarch/schema";
import { fileProblem, readJsonFile } from "../io";
import { fail } from "../parse";
import { inspectReport } from "./inspectReport";

export interface InspectOptions {
  file?: string;
  json: boolean;
  top: number;
  metric?: string;
  help: boolean;
}

export function runInspect(options: InspectOptions): number {
  if (!options.file) {
    return fail("falta la ruta del fichero cc.json\n\n  codarch inspect <fichero.cc.json[.gz]>");
  }

  const loaded = loadSnapshot(options.file);
  if (typeof loaded === "number") return loaded;
  return report(options, options.file, loaded);
}

/** El informe, en JSON o en texto, sobre un snapshot ya leído. */
function report(
  options: InspectOptions,
  file: string,
  loaded: { bytes: number; cc: CcJson }
): number {
  const stats = getStats(loaded.cc);
  const metric = options.metric ?? defaultMetric(stats) ?? null;

  if (options.metric && !hasMetric(stats, options.metric)) {
    return fail(`la métrica "${options.metric}" no existe en este fichero`);
  }

  const top = metric ? topByMetric(loaded.cc, metric, options.top) : [];

  if (options.json) {
    console.log(JSON.stringify({ file, meta: loaded.cc.meta, stats, metric, top }, null, 2));
    return 0;
  }

  console.log(
    inspectReport({ file, bytes: loaded.bytes, cc: loaded.cc, stats, metric, top })
  );
  return 0;
}

/** El cc.json leído y validado, o el código de salida con su aviso ya dicho. */
function loadSnapshot(file: string): { bytes: number; cc: CcJson } | number {
  // Una carpeta aquí es un EISDIR que no explica nada; se dice qué se espera.
  const problem = fileProblem(file);
  if (problem) {
    return fail(
      `inspect necesita un fichero cc.json: ${problem}\n\n  codarch inspect <fichero.cc.json[.gz]>`
    );
  }

  let loaded;
  try {
    loaded = readJsonFile(file);
  } catch (error) {
    return fail(`no se pudo leer ${file}: ${(error as Error).message}`);
  }

  try {
    return { bytes: loaded.bytes, cc: parseCcJson(loaded.json) };
  } catch (error) {
    if (error instanceof CcJsonError) {
      return fail(`cc.json inválido: ${error.message}`);
    }
    throw error;
  }
}

/** Si la métrica pedida la cubre al menos un fichero. */
function hasMetric(stats: CcStats, name: string): boolean {
  return stats.metricCoverage.some((entry) => entry.name === name);
}
