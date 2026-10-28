import fs from "node:fs";
import path from "node:path";
import {
  diffSnapshots,
  type DiffReport,
  type RuleConfig
} from "@codarch/metrics";
import { formatBytes } from "../io";
import type { FailOn } from "./diff";

/**
 * Comparar dos snapshots y contarlo.
 *
 * Lo usan `codarch diff` (dos ficheros) y `codarch history` (dos momentos de la
 * línea del tiempo): el motor es el mismo ✓.
 *
 * La función tiene cuatro fases y cada una se lee sola: comparar, escribir el
 * reporte si se pidió, componer el informe y decidir el gate. El gate no puede
 * fallar por un problema de escritura ni el informe puede tumbar la comparación.
 */

export interface CompareOptions {
  /**
   * Dónde se escribe el reporte.
   *
   * Sin esto no se escribe ningún fichero: el informe se lee en la terminal y
   * el JSON solo aparece si se pide con `-o`. Antes se dejaba un
   * `report.json` en el directorio actual sin que nadie lo hubiera pedido.
   */
  out?: string;
  top?: number;
  hotspotMetric?: string;
  failOn?: FailOn;
  rules?: RuleConfig;
  configPath?: string;
  /** Cómo se llama a cada lado, para el informe. */
  baseLabel: string;
  headLabel: string;
  /** Título de la cabecera del informe. */
  title: string;
}

const numberFormat = new Intl.NumberFormat("es-ES");

/** Cuántos elementos de cada lista se enseñan antes de resumir el resto. */
const SHOWN = 5;

function num(value: number): string {
  return numberFormat.format(value);
}

function field(label: string, value: string): string {
  return `  ${label.padEnd(12)} ${value}`;
}

function signed(value: number): string {
  if (value === 0) return "0";
  return value > 0 ? `+${num(value)}` : num(value);
}

/** Dónde acabó el reporte: sin `-o` no hay ruta ni bytes. */
interface WrittenReport {
  outPath: string | null;
  bytes: number;
}

export function compareSnapshots(
  base: Parameters<typeof diffSnapshots>[0],
  head: Parameters<typeof diffSnapshots>[1],
  options: CompareOptions
): number {
  let report: DiffReport;
  try {
    report = diffSnapshots(base, head, {
      top: options.top,
      hotspotMetric: options.hotspotMetric,
      rules: options.rules
    });
  } catch (error) {
    console.error(`no se pudo comparar: ${(error as Error).message}`);
    return 1;
  }

  const written = writeReport(options.out, report);
  if (!written) return 1;

  console.log(renderReport(report, options, written).join("\n"));

  const failure = gateFailure(report, options.failOn ?? "none");
  if (failure) {
    console.error(`  gate fallido: ${failure}`);
    return 2;
  }

  return 0;
}

/** El `cc.json` del reporte, si se pidió; `null` cuando no se pudo escribir. */
function writeReport(
  out: string | undefined,
  report: DiffReport
): WrittenReport | null {
  if (!out) return { outPath: null, bytes: 0 };

  const outPath = path.resolve(out);
  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const text = `${JSON.stringify(report, null, 2)}\n`;
    fs.writeFileSync(outPath, text, "utf8");
    return { outPath, bytes: Buffer.byteLength(text, "utf8") };
  } catch (error) {
    console.error(`no se pudo escribir ${outPath}: ${(error as Error).message}`);
    return null;
  }
}

function renderReport(
  report: DiffReport,
  options: CompareOptions,
  written: WrittenReport
): string[] {
  return [
    "",
    `  CodArch · ${options.title}`,
    "",
    ...summaryLines(report, options, written),
    ...cycleLines(report),
    ...symbolLines(report),
    ...hotspotLines(report),
    ...violationLines(report),
    ""
  ];
}

/** El bloque de campos: los totales del cambio, uno por línea. */
function summaryLines(
  report: DiffReport,
  options: CompareOptions,
  written: WrittenReport
): string[] {
  const { summary } = report;
  return [
    field(
      "base",
      `${options.baseLabel} (${report.base.checksum || "sin checksum"})`
    ),
    field(
      "head",
      `${options.headLabel} (${report.head.checksum || "sin checksum"})`
    ),
    field(
      "ficheros",
      `${signed(summary.addedFiles)} · ${signed(
        -summary.removedFiles
      )} · ~${num(summary.changedFiles)}`
    ),
    field(
      "aristas",
      `${signed(summary.addedEdges)} · ${signed(
        -summary.removedEdges
      )} · ${num(summary.cyclicEdgesAdded)} cíclicas nuevas`
    ),
    field(
      "código",
      `${signed(summary.addedRloc)} rloc añadidos · ${signed(
        -summary.removedRloc
      )} · ~${signed(summary.changedRloc)} en ficheros cambiados`
    ),
    field("símbolos", symbolsText(report)),
    field(
      "ciclos",
      `${signed(summary.introducedCycles)} nuevos · ${signed(
        -summary.fixedCycles
      )} resueltos`
    ),
    field(
      "hotspots",
      report.hotspotMetric
        ? `${num(summary.hotspots)} (${report.hotspotMetric})`
        : "sin métrica de complejidad ni tamaño"
    ),
    field("reglas", rulesText(report, options)),
    field(
      "reporte",
      written.outPath
        ? `${written.outPath} (${formatBytes(written.bytes)})`
        : "sin escribir · -o <fichero> para guardarlo"
    )
  ];
}

function symbolsText(report: DiffReport): string {
  const symbols = report.symbols;
  if (!symbols) return "sin lente de símbolos";
  return `${signed(symbols.summary.added)} · ${signed(
    -symbols.summary.removed
  )} · ~${num(symbols.summary.changed)}`;
}

function rulesText(report: DiffReport, options: CompareOptions): string {
  const { rules } = report;
  if (!rules.configured) return "sin configuración";
  const where = options.configPath ? ` (${options.configPath})` : "";
  return `${num(rules.summary.layers)} capas · ${num(
    rules.summary.rules
  )} reglas · ${num(rules.summary.introduced)} nuevas · ${num(
    rules.summary.existing
  )} existentes${where}`;
}

/** Los ciclos nuevos, con los que caben en pantalla. */
function cycleLines(report: DiffReport): string[] {
  const cycles = report.cycles.introduced;
  if (cycles.length === 0) return ["", "  Sin ciclos nuevos."];

  const lines = ["", "  Ciclos nuevos:"];
  for (const cycle of cycles.slice(0, SHOWN)) {
    lines.push(`    ✗ ${cycle.nodes.map((node) => node.path).join(" → ")}`);
  }
  lines.push(...overflow(cycles.length, `    … y ${num(cycles.length - SHOWN)} más`));
  return lines;
}

/** Los símbolos que más cambiaron, fichero a fichero. */
function symbolLines(report: DiffReport): string[] {
  const files = report.symbols?.files ?? [];
  if (files.length === 0) return [];

  const lines = ["", "  Símbolos que más cambiaron:"];
  for (const file of files.slice(0, SHOWN)) {
    const changed = file.symbols.filter((symbol) => symbol.status === "changed");
    const first = changed[0] ?? file.symbols[0];
    if (!first) continue;
    lines.push(`    · ${file.path}  ${first.name} (${symbolDetail(first)})`);
    if (changed.length > 1) {
      lines.push(`      y ${num(changed.length - 1)} más en este fichero`);
    }
  }
  return lines;
}

/** Cómo cambió un símbolo, en una palabra: su delta, nuevo o eliminado. */
function symbolDetail(symbol: NonNullable<DiffReport["symbols"]>["files"][number]["symbols"][number]): string {
  if (symbol.status === "changed" && symbol.complexityDelta !== null) {
    return `complejidad ${signed(symbol.complexityDelta)}`;
  }
  return symbol.status === "added" ? "nuevo" : "eliminado";
}

function hotspotLines(report: DiffReport): string[] {
  if (report.hotspots.length === 0) return [];

  const lines = ["", `  Hotspots (${report.hotspotMetric}):`];
  for (const hotspot of report.hotspots.slice(0, SHOWN)) {
    lines.push(
      `    ● ${hotspot.path}  ${num(hotspot.base)} → ${num(
        hotspot.head
      )} (${signed(hotspot.delta)})`
    );
  }
  lines.push(
    ...overflow(
      report.hotspots.length,
      `    … y ${num(report.hotspots.length - SHOWN)} más`
    )
  );
  return lines;
}

function violationLines(report: DiffReport): string[] {
  const violations = report.rules.violations.introduced;
  if (violations.length === 0) return [];

  const lines = ["", "  Violaciones nuevas:"];
  for (const violation of violations.slice(0, SHOWN)) {
    lines.push(`    ${severityIcon(violation.severity)} [${violation.rule}] ${violation.message}`);
  }
  lines.push(
    ...overflow(
      violations.length,
      `    … y ${num(violations.length - SHOWN)} más`
    )
  );
  return lines;
}

function severityIcon(severity: string): string {
  if (severity === "error") return "✗";
  return severity === "warn" ? "!" : "·";
}

/** La línea de «quedan más», solo cuando de verdad quedan. */
function overflow(total: number, line: string): string[] {
  return total > SHOWN ? [line] : [];
}

/**
 * Qué hizo fallar el gate, o `null` si pasó.
 *
 * Cada modo pide algo distinto y `any` es la unión: se informa de todo lo que
 * falló, no de lo primero que se encontró.
 */
function gateFailure(report: DiffReport, failOn: FailOn): string | null {
  const failed: string[] = [];
  if (
    (failOn === "cycles" || failOn === "any") &&
    report.summary.introducedCycles > 0
  ) {
    failed.push("ciclos nuevos");
  }
  if (
    (failOn === "hotspots" || failOn === "any") &&
    report.summary.hotspots > 0
  ) {
    failed.push("hotspots");
  }
  if (
    (failOn === "violations" || failOn === "any") &&
    report.rules.summary.introducedErrors > 0
  ) {
    failed.push("violaciones nuevas");
  }
  return failed.length > 0 ? failed.join(" + ") : null;
}
