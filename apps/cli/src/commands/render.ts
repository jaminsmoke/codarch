import fs from "node:fs";
import path from "node:path";
import { buildRenderModel, renderHtml, RenderError } from "@codarch/render";
import { CcJsonError, parseCcJson } from "@codarch/schema";
import { formatBytes, readJsonFile } from "../io";

export interface RenderCommandOptions {
  file?: string;
  out?: string;
  area?: string;
  color?: string;
  title?: string;
  help: boolean;
}

export function defaultOutputPath(input: string): string {
  const lower = input.toLowerCase();
  const suffixes = [".cc.json.gz", ".cc.json", ".json.gz", ".json", ".gz"];
  for (const suffix of suffixes) {
    if (lower.endsWith(suffix)) return `${input.slice(0, -suffix.length)}.html`;
  }
  return `${input}.html`;
}

/** Nombre legible cuando el cc.json no trae `projectName`. */
export function defaultProjectName(input: string): string {
  let name = path.basename(input);
  const lower = name.toLowerCase();
  const suffixes = [".cc.json.gz", ".cc.json", ".json.gz", ".json", ".gz"];
  for (const suffix of suffixes) {
    if (lower.endsWith(suffix)) {
      name = name.slice(0, -suffix.length);
      break;
    }
  }
  return name || "Proyecto sin nombre";
}

const numberFormat = new Intl.NumberFormat("es-ES");

function num(value: number): string {
  return numberFormat.format(value);
}

function field(label: string, value: string): string {
  return `  ${label.padEnd(12)} ${value}`;
}

export function runRender(options: RenderCommandOptions): number {
  if (!options.file) {
    console.error(
      "falta la ruta del fichero cc.json\n\n  codarch render <fichero.cc.json[.gz]> [-o mapa.html]"
    );
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

  const started = Date.now();
  let model;
  try {
    model = buildRenderModel(cc, {
      areaMetric: options.area,
      color: options.color,
      title:
        options.title ??
        (cc.meta.projectName ? undefined : defaultProjectName(options.file))
    });
  } catch (error) {
    if (error instanceof RenderError) {
      console.error(`no se pudo construir el mapa: ${error.message}`);
      return 1;
    }
    throw error;
  }

  let html: string;
  try {
    html = renderHtml(model);
  } catch (error) {
    console.error(`no se pudo generar el HTML: ${(error as Error).message}`);
    return 1;
  }
  const elapsed = Date.now() - started;

  const out = options.out ?? defaultOutputPath(options.file);
  try {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, html, "utf8");
  } catch (error) {
    console.error(`no se pudo escribir ${out}: ${(error as Error).message}`);
    return 1;
  }

  const bytes = Buffer.byteLength(html, "utf8");
  const lens =
    model.initialLens === "structure"
      ? "estructura"
      : model.initialLens === "risk"
        ? "riesgo"
        : (model.initialMetric ?? "métrica");

  const lines: string[] = [];
  lines.push("");
  lines.push("  CodArch · mapa");
  lines.push("");
  lines.push(field("fichero", `${options.file} (${formatBytes(loaded.bytes)})`));
  lines.push(field("salida", `${out} (${formatBytes(bytes)})`));
  lines.push(
    field(
      "estructura",
      `${num(model.fileCount)} ficheros · ${num(model.folderCount)} carpetas · ${num(
        model.metrics.length
      )} métricas`
    )
  );
  lines.push(
    field("área", `${model.areaMetric ?? "(sin métrica)"} · ${num(model.totalArea)} en total`)
  );
  lines.push(field("color", `${lens} · ${num(model.hotspotCount)} hotspots`));
  lines.push(
    field(
      "dependencias",
      `${num(model.edges.length)} aristas · ${num(model.cycles.length)} cíclicas`
    )
  );
  lines.push(field("tiempo", `${num(elapsed)} ms`));
  for (const warning of model.warnings) {
    lines.push(field("aviso", warning));
  }
  lines.push("");
  console.log(lines.join("\n"));
  return 0;
}
