import { CcJsonError, defaultMetric, getStats, parseCcJson, topByMetric } from "@codarch/schema";
import { formatBytes, readJsonFile } from "../io";

export interface InspectOptions {
  file?: string;
  json: boolean;
  top: number;
  metric?: string;
  help: boolean;
}

const numberFormat = new Intl.NumberFormat("es-ES");

function num(value: number): string {
  return numberFormat.format(value);
}

function field(label: string, value: string): string {
  return `  ${label.padEnd(12)} ${value}`;
}

function truncateLeft(value: string, max = 78): string {
  if (value.length <= max) return value;
  return `…${value.slice(value.length - max + 1)}`;
}

function shortChecksum(value: string | undefined): string {
  return value ? `${value.slice(0, 8)}…` : "—";
}

export function runInspect(options: InspectOptions): number {
  if (!options.file) {
    console.error("falta la ruta del fichero cc.json\n\n  codarch inspect <fichero.cc.json[.gz]>");
    return 1;
  }

  let loaded;
  try {
    loaded = readJsonFile(options.file);
  } catch (error) {
    console.error(`no se pudo leer ${options.file}: ${(error as Error).message}`);
    return 1;
  }

  let cc;
  try {
    cc = parseCcJson(loaded.json);
  } catch (error) {
    if (error instanceof CcJsonError) {
      console.error(`cc.json inválido: ${error.message}`);
      return 1;
    }
    throw error;
  }

  const stats = getStats(cc);
  const metric = options.metric ?? defaultMetric(stats);
  const top = metric ? topByMetric(cc, metric, options.top) : [];

  // Un único nodo raíz suele ser un contenedor sintético ("root"): no ensucia la ruta mostrada.
  const rootPrefix = cc.files.length === 1 ? `${cc.files[0]?.name}/` : "";
  const displayPath = (path: string): string =>
    rootPrefix && path.startsWith(rootPrefix) ? path.slice(rootPrefix.length) : path;

  if (options.metric && !stats.metricCoverage.some((entry) => entry.name === options.metric)) {
    console.error(`la métrica "${options.metric}" no existe en este fichero`);
    return 1;
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          file: options.file,
          meta: cc.meta,
          stats,
          metric: metric ?? null,
          top
        },
        null,
        2
      )
    );
    return 0;
  }

  const lines: string[] = [];
  lines.push("");
  lines.push("  CodArch · inspección");
  lines.push("");
  lines.push(field("fichero", `${options.file} (${formatBytes(loaded.bytes)})`));
  lines.push(field("formato", `cc.json ${cc.meta.apiVersion}`));
  lines.push(field("proyecto", cc.meta.projectName || "(sin nombre)"));
  lines.push(field("checksum", shortChecksum(cc.meta.checksum)));
  lines.push(field("commit", cc.meta.commitHash || "—"));
  lines.push("");
  lines.push(
    field(
      "estructura",
      `${num(stats.files)} ficheros · ${num(stats.folders)} carpetas · profundidad ${stats.maxDepth}`
    )
  );
  lines.push(field("lentes", stats.lenses.length ? stats.lenses.join(" · ") : "ninguna"));
  const coverage = metric
    ? stats.metricCoverage.find((entry) => entry.name === metric)
    : undefined;
  lines.push(
    field(
      "métricas",
      `${num(stats.metricNames)} distintas` +
        (coverage ? ` · ${metric} en ${num(coverage.files)} ficheros` : "")
    )
  );
  lines.push(
    field("aristas", `${num(stats.edges)} · leafEdges ${num(stats.leafEdges)}`)
  );
  if (stats.orphanMetricNodes > 0) {
    lines.push(field("huérfanos", `${num(stats.orphanMetricNodes)} nodos de métricas sin fichero`));
  }

  if (metric && top.length > 0) {
    lines.push("");
    lines.push(`  Top ${top.length} por ${metric}`);
    const width = Math.max(...top.map((entry) => num(entry.value).length));
    for (const entry of top) {
      lines.push(`    ${num(entry.value).padStart(width)}  ${truncateLeft(displayPath(entry.path))}`);
    }
  }

  lines.push("");
  console.log(lines.join("\n"));
  return 0;
}
