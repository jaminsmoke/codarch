import fs from "node:fs";
import path from "node:path";
import {
  ConfigError,
  diffSnapshots,
  loadRuleConfig,
  type DiffReport,
  type RuleConfig
} from "@codarch/metrics";
import { CcJsonError, parseCcJson, type CcJson } from "@codarch/schema";
import { formatBytes, readJsonFile } from "../io";

export type FailOn =
  | "none"
  | "cycles"
  | "violations"
  | "hotspots"
  | "any";

export interface DiffCommandOptions {
  base?: string;
  head?: string;
  out?: string;
  top?: number;
  hotspotMetric?: string;
  failOn?: FailOn;
  /** Fichero YAML; si falta, se busca `.codarch.yml` en el cwd. */
  config?: string;
  noConfig?: boolean;
  help: boolean;
}

const numberFormat = new Intl.NumberFormat("es-ES");

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

export function runDiff(options: DiffCommandOptions): number {
  if (!options.base || !options.head) {
    console.error(
      "faltan los dos snapshots\n\n  codarch diff <base.cc.json> <head.cc.json> [-o report.json]"
    );
    return 1;
  }

  const base = loadSnapshot(options.base);
  if (!base) return 1;
  const head = loadSnapshot(options.head);
  if (!head) return 1;

  let rules: RuleConfig | undefined;
  let configPath: string | undefined;
  try {
    if (!options.noConfig) {
      configPath = options.config ?? defaultConfigPath();
      if (configPath) rules = loadRuleConfig(configPath);
    }
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`configuración inválida: ${error.message}`);
      return 1;
    }
    throw error;
  }

  let report: DiffReport;
  try {
    report = diffSnapshots(base, head, {
      top: options.top,
      hotspotMetric: options.hotspotMetric,
      rules
    });
  } catch (error) {
    console.error(`no se pudo comparar: ${(error as Error).message}`);
    return 1;
  }

  const outPath = path.resolve(options.out ?? "report.json");
  let reportBytes = 0;
  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const text = `${JSON.stringify(report, null, 2)}\n`;
    fs.writeFileSync(outPath, text, "utf8");
    reportBytes = Buffer.byteLength(text, "utf8");
  } catch (error) {
    console.error(
      `no se pudo escribir ${outPath}: ${(error as Error).message}`
    );
    return 1;
  }

  const lines: string[] = [];
  lines.push("");
  lines.push("  CodArch · diff");
  lines.push("");
  lines.push(field("base", `${options.base} (${report.base.checksum || "sin checksum"})`));
  lines.push(field("head", `${options.head} (${report.head.checksum || "sin checksum"})`));
  lines.push(
    field(
      "ficheros",
      `${signed(report.summary.addedFiles)} · ${signed(
        -report.summary.removedFiles
      )} · ~${num(report.summary.changedFiles)}`
    )
  );
  lines.push(
    field(
      "aristas",
      `${signed(report.summary.addedEdges)} · ${signed(
        -report.summary.removedEdges
      )} · ${num(report.summary.cyclicEdgesAdded)} cíclicas nuevas`
    )
  );
  lines.push(
    field(
      "ciclos",
      `${signed(report.summary.introducedCycles)} nuevos · ${signed(
        -report.summary.fixedCycles
      )} resueltos`
    )
  );
  lines.push(
    field(
      "hotspots",
      report.hotspotMetric
        ? `${num(report.summary.hotspots)} (${report.hotspotMetric})`
        : "sin métrica de complejidad ni tamaño"
    )
  );
  lines.push(
    field(
      "reglas",
      report.rules.configured
        ? `${num(report.rules.summary.layers)} capas · ${num(
            report.rules.summary.rules
          )} reglas · ${num(report.rules.summary.introduced)} nuevas · ${num(
            report.rules.summary.existing
          )} existentes${configPath ? ` (${configPath})` : ""}`
        : "sin configuración"
    )
  );
  lines.push(field("reporte", `${outPath} (${formatBytes(reportBytes)})`));

  lines.push("");
  if (report.cycles.introduced.length === 0) {
    lines.push("  Sin ciclos nuevos.");
  } else {
    lines.push("  Ciclos nuevos:");
    for (const cycle of report.cycles.introduced.slice(0, 5)) {
      lines.push(
        `    ✗ ${cycle.nodes
          .map((node) => node.path)
          .join(" → ")}`
      );
    }
    if (report.cycles.introduced.length > 5) {
      lines.push(
        `    … y ${num(report.cycles.introduced.length - 5)} más`
      );
    }
  }

  if (report.hotspots.length > 0) {
    lines.push("");
    lines.push(`  Hotspots (${report.hotspotMetric}):`);
    for (const hotspot of report.hotspots.slice(0, 5)) {
      lines.push(
        `    ● ${hotspot.path}  ${num(hotspot.base)} → ${num(
          hotspot.head
        )} (${signed(hotspot.delta)})`
      );
    }
    if (report.hotspots.length > 5) {
      lines.push(`    … y ${num(report.hotspots.length - 5)} más`);
    }
  }

  if (report.rules.violations.introduced.length > 0) {
    lines.push("");
    lines.push("  Violaciones nuevas:");
    for (const violation of report.rules.violations.introduced.slice(0, 5)) {
      const icon =
        violation.severity === "error"
          ? "✗"
          : violation.severity === "warn"
            ? "!"
            : "·";
      lines.push(`    ${icon} [${violation.rule}] ${violation.message}`);
    }
    if (report.rules.violations.introduced.length > 5) {
      lines.push(
        `    … y ${num(report.rules.violations.introduced.length - 5)} más`
      );
    }
  }

  lines.push("");
  console.log(lines.join("\n"));

  const failOn = options.failOn ?? "none";
  const cyclesFailed =
    (failOn === "cycles" || failOn === "any") &&
    report.summary.introducedCycles > 0;
  const hotspotsFailed =
    (failOn === "hotspots" || failOn === "any") &&
    report.summary.hotspots > 0;
  const violationsFailed =
    (failOn === "violations" || failOn === "any") &&
    report.rules.summary.introducedErrors > 0;

  if (cyclesFailed || hotspotsFailed || violationsFailed) {
    console.error(
      `  gate fallido: ${[
        cyclesFailed ? "ciclos nuevos" : "",
        hotspotsFailed ? "hotspots" : "",
        violationsFailed ? "violaciones nuevas" : ""
      ]
        .filter(Boolean)
        .join(" + ")}`
    );
    return 2;
  }

  return 0;
}

function loadSnapshot(file: string): CcJson | null {
  let loaded;
  try {
    loaded = readJsonFile(file);
  } catch (error) {
    console.error(`no se pudo leer ${file}: ${(error as Error).message}`);
    return null;
  }

  try {
    return parseCcJson(loaded.json);
  } catch (error) {
    if (error instanceof CcJsonError) {
      console.error(`cc.json inválido en ${file}: ${error.message}`);
      return null;
    }
    throw error;
  }
}

function defaultConfigPath(): string | undefined {
  for (const file of [".codarch.yml", ".codarch.yaml"]) {
    if (fs.existsSync(file)) return file;
  }
  return undefined;
}
