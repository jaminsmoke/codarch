import fs from "node:fs";
import path from "node:path";
import { analyzeRepository } from "@codarch/parsers";
import { buildRenderModel, renderHtml, RenderError } from "@codarch/render";
import { CcJsonError, parseCcJson } from "@codarch/schema";
import { formatBytes } from "../io";
import { saveHistory } from "./history-store";

export interface AnalyzeCommandOptions {
  root?: string;
  out?: string;
  ignore?: string[];
  projectName?: string;
  title?: string;
  /** `false` desactiva churn de git. */
  git?: boolean;
  /** Guarda la foto en el historial del repo. */
  history?: boolean;
  help: boolean;
}

const numberFormat = new Intl.NumberFormat("es-ES");

function num(value: number): string {
  return numberFormat.format(value);
}

function field(label: string, value: string): string {
  return `  ${label.padEnd(12)} ${value}`;
}

export function runAnalyze(options: AnalyzeCommandOptions): number {
  const root = options.root ?? ".";
  let result;

  try {
    result = analyzeRepository(root, {
      ignore: options.ignore,
      projectName: options.projectName,
      git: options.git
    });
  } catch (error) {
    console.error(`no se pudo analizar ${root}: ${(error as Error).message}`);
    return 1;
  }

  let cc;
  try {
    cc = parseCcJson(result.snapshot);
  } catch (error) {
    if (error instanceof CcJsonError) {
      console.error(`el snapshot generado no es cc.json válido: ${error.message}`);
      return 1;
    }
    throw error;
  }

  const outDirectory = path.resolve(
    options.out ?? path.join(path.resolve(root), ".codarch")
  );
  const snapshotPath = path.join(outDirectory, "snapshot.cc.json");
  const mapPath = path.join(outDirectory, "map.html");

  try {
    fs.mkdirSync(outDirectory, { recursive: true });
    fs.writeFileSync(
      snapshotPath,
      `${JSON.stringify(cc, null, 2)}\n`,
      "utf8"
    );
  } catch (error) {
    console.error(
      `no se pudo escribir ${snapshotPath}: ${(error as Error).message}`
    );
    return 1;
  }

  let mapBytes = 0;
  let mapError: string | null = null;

  if (result.files > 0) {
    try {
      const model = buildRenderModel(cc, {
        areaMetric: "rloc",
        color: "risk",
        title: options.title
      });
      const html = renderHtml(model);
      fs.writeFileSync(mapPath, html, "utf8");
      mapBytes = Buffer.byteLength(html, "utf8");
    } catch (error) {
      mapError =
        error instanceof RenderError
          ? error.message
          : (error as Error).message;
    }
  } else {
    mapError = "no hay ficheros TypeScript/JavaScript que dibujar";
  }

  const snapshotBytes = Buffer.byteLength(
    fs.readFileSync(snapshotPath),
    "utf8"
  );

  const lines: string[] = [];
  lines.push("");
  lines.push("  CodArch · análisis");
  lines.push("");
  lines.push(field("raíz", path.resolve(root)));
  lines.push(field("snapshot", `${snapshotPath} (${formatBytes(snapshotBytes)})`));
  if (mapError) {
    lines.push(field("mapa", `omitido (${mapError})`));
  } else {
    lines.push(field("mapa", `${mapPath} (${formatBytes(mapBytes)})`));
  }
  lines.push(
    field(
      "estructura",
      `${num(result.files)} ficheros · ${num(result.folders)} carpetas · ${num(
        result.edges
      )} aristas · ${num(result.cycles.length)} ciclos`
    )
  );
  lines.push(
    field(
      "imports",
      `${num(result.externalImports)} externos · ${num(
        result.builtinImports
      )} builtins · ${num(result.typeOnlyImports)} type-only · ${num(
        result.unresolvedImports
      )} sin resolver`
    )
  );
  const migrationLanguages = Object.entries(result.migration.languages)
    .map(([language, stats]) => `${language} ${num(stats?.rloc ?? 0)}`)
    .join(" · ");
  lines.push(
    field(
      "migración",
      `${migrationLanguages || "—"} · ${num(
        result.migration.bridgeFiles
      )} puentes · ${num(result.migration.ffiEdges)} FFI · deuda ${num(
        result.migration.migrationDebt
      )}`
    )
  );
  lines.push(field("tiempo", `${num(result.durationMs)} ms`));
  if (options.history) {
    try {
      const saved = saveHistory(path.resolve(root), cc, new Date());
      lines.push(
        field(
          "historial",
          saved.saved
            ? `guardado ${saved.file}`
            : "sin cambios; ya había una foto igual"
        )
      );
    } catch (error) {
      lines.push(field("historial", `no se pudo guardar: ${(error as Error).message}`));
    }
  }
  lines.push(
    field(
      "churn",
      result.git.enabled
        ? `${num(result.git.commits)} commits · ${num(
            result.git.authors
          )} autores${result.git.shallow ? " · shallow" : ""}`
        : "sin git; se omite churn"
    )
  );

  for (const warning of result.warnings.slice(0, 10)) {
    lines.push(field("aviso", warning));
  }
  if (result.warnings.length > 10) {
    lines.push(field("aviso", `y ${num(result.warnings.length - 10)} más`));
  }

  for (const issue of result.unresolved.slice(0, 5)) {
    lines.push(
      field(
        "sin resolver",
        `${issue.file}:${issue.line} ${issue.specifier} (${issue.reason})`
      )
    );
  }
  if (result.unresolved.length > 5) {
    lines.push(
      field("sin resolver", `y ${num(result.unresolved.length - 5)} más`)
    );
  }

  lines.push("");
  console.log(lines.join("\n"));
  return 0;
}
