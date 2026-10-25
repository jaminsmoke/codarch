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

  let outPath: string | null = null;
  let reportBytes = 0;
  if (options.out) {
    outPath = path.resolve(options.out);
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
  }

  const lines: string[] = [];
  lines.push("");
  lines.push(`  CodArch · ${options.title}`);
  lines.push("");
  lines.push(
    field("base", `${options.baseLabel} (${report.base.checksum || "sin checksum"})`)
  );
  lines.push(
    field("head", `${options.headLabel} (${report.head.checksum || "sin checksum"})`)
  );
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
      "código",
      `${signed(report.summary.addedRloc)} rloc añadidos · ${signed(
        -report.summary.removedRloc
      )} · ~${signed(report.summary.changedRloc)} en ficheros cambiados`
    )
  );
  lines.push(
    field(
      "símbolos",
      report.symbols
        ? `${signed(report.symbols.summary.added)} · ${signed(
            -report.symbols.summary.removed
          )} · ~${num(report.symbols.summary.changed)}`
        : "sin lente de símbolos"
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
          )} existentes${options.configPath ? ` (${options.configPath})` : ""}`
        : "sin configuración"
    )
  );
  lines.push(
    field(
      "reporte",
      outPath
        ? `${outPath} (${formatBytes(reportBytes)})`
        : "sin escribir · -o <fichero> para guardarlo"
    )
  );

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

  if (report.symbols && report.symbols.files.length > 0) {
    lines.push("");
    lines.push("  Símbolos que más cambiaron:");
    for (const file of report.symbols.files.slice(0, 5)) {
      const changed = file.symbols.filter(
        (symbol) => symbol.status === "changed"
      );
      const first = changed[0] ?? file.symbols[0];
      if (!first) continue;
      const detail =
        first.status === "changed" && first.complexityDelta !== null
          ? `complejidad ${signed(first.complexityDelta)}`
          : first.status === "added"
            ? "nuevo"
            : "eliminado";
      lines.push(
        `    · ${file.path}  ${first.name} (${detail})`
      );
      if (changed.length > 1) {
        lines.push(
          `      y ${num(changed.length - 1)} más en este fichero`
        );
      }
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
