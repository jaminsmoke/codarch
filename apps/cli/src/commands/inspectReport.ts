import type { CcJson, CcMigrationLens, CcStats, RankedFile } from "@codarch/schema";
import { formatBytes } from "../io";

/**
 * El informe de `codarch inspect`.
 *
 * Un snapshot se cuenta en tres bloques: **qué es** (fichero, formato,
 * proyecto), **qué tiene** (estructura, lentes, métricas, aristas, migración) y
 * **el ranking** por la métrica pedida. Cada bloque es una función que devuelve
 * sus líneas; el orden y el texto son los de siempre.
 */

export interface InspectReportInput {
  file: string;
  bytes: number;
  cc: CcJson;
  stats: CcStats;
  metric: string | null;
  top: RankedFile[];
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

/** La lente de migración, si el snapshot la trae con su resumen. */
function readMigrationLens(value: unknown): CcMigrationLens | null {
  if (typeof value !== "object" || value === null) return null;
  const lens = value as Partial<CcMigrationLens>;
  if (typeof lens.summary !== "object" || lens.summary === null) return null;
  return lens as CcMigrationLens;
}

/** El informe entero, ya como texto listo para imprimir. */
export function inspectReport(input: InspectReportInput): string {
  const lines = [
    "",
    "  CodArch · inspección",
    "",
    ...identity(input),
    "",
    ...shape(input.stats, input.metric)
  ];

  const migration = migrationField(
    readMigrationLens(input.cc.lenses?.migration)
  );
  if (migration) lines.push(migration);

  const orphans = orphanField(input.stats);
  if (orphans) lines.push(orphans);

  if (input.metric && input.top.length > 0) {
    lines.push("", ...ranking(input, displayPathFor(input.cc)));
  }

  lines.push("");
  return lines.join("\n");
}

/** De dónde sale lo que se está mirando. */
function identity({ file, bytes, cc }: InspectReportInput): string[] {
  return [
    field("fichero", `${file} (${formatBytes(bytes)})`),
    field("formato", `cc.json ${cc.meta.apiVersion}`),
    field("proyecto", cc.meta.projectName || "(sin nombre)"),
    field("checksum", shortChecksum(cc.meta.checksum)),
    field("commit", cc.meta.commitHash || "—")
  ];
}

/** Lo que hay dentro: tamaño, lentes, métricas y aristas. */
function shape(stats: CcStats, metric: string | null): string[] {
  return [
    field(
      "estructura",
      `${num(stats.files)} ficheros · ${num(stats.folders)} carpetas · profundidad ${stats.maxDepth}`
    ),
    field("lentes", stats.lenses.length ? stats.lenses.join(" · ") : "ninguna"),
    field("métricas", coverageText(stats, metric)),
    field("aristas", `${num(stats.edges)} · leafEdges ${num(stats.leafEdges)}`)
  ];
}

/** «12 distintas · rloc en 120 ficheros», con la cobertura de la métrica. */
function coverageText(stats: CcStats, metric: string | null): string {
  const base = `${num(stats.metricNames)} distintas`;
  const coverage = metric
    ? stats.metricCoverage.find((entry) => entry.name === metric)
    : undefined;
  if (!coverage) return base;
  return `${base} · ${metric} en ${num(coverage.files)} ficheros`;
}

/** La deuda de migración, si hay lente. */
function migrationField(lens: CcMigrationLens | null): string | null {
  if (!lens) return null;
  const languages = Object.entries(lens.summary.languages)
    .map(([language, entry]) => `${language} ${num(entry?.rloc ?? 0)}`)
    .join(" · ");
  return field(
    "migración",
    `${languages || "—"} · ${num(lens.summary.bridgeFiles)} puentes · ${num(
      lens.summary.ffiEdges
    )} FFI · deuda ${num(lens.summary.migrationDebt)}`
  );
}

/** Los nodos de métricas que no tienen fichero, si los hay. */
function orphanField(stats: CcStats): string | null {
  if (stats.orphanMetricNodes <= 0) return null;
  return field(
    "huérfanos",
    `${num(stats.orphanMetricNodes)} nodos de métricas sin fichero`
  );
}

/** El ranking de la métrica, con su columna de cifras alineada. */
function ranking(
  input: InspectReportInput,
  displayPath: (path: string) => string
): string[] {
  const { top, metric } = input;
  const width = Math.max(...top.map((entry) => num(entry.value).length));
  const rows = top.map(
    (entry) =>
      `    ${num(entry.value).padStart(width)}  ${truncateLeft(displayPath(entry.path))}`
  );
  return [`  Top ${top.length} por ${metric}`, ...rows];
}

/**
 * La ruta sin el contenedor sintético de un único nodo raíz («root/»): no
 * ensucia lo que se enseña.
 */
function displayPathFor(cc: CcJson): (path: string) => string {
  const prefix = cc.files.length === 1 ? `${cc.files[0]?.name}/` : "";
  return (path) => (prefix && path.startsWith(prefix) ? path.slice(prefix.length) : path);
}
