import path from "node:path";
import { CcJsonError, parseCcJson } from "@codarch/schema";
import { RenderError } from "@codarch/render";
import { captureMap } from "@codarch/render/node";
import { formatBytes, readJsonFile } from "../io";

export interface ShotCommandOptions {
  file?: string;
  area?: string;
  color?: string;
  out?: string;
  width?: number;
  height?: number;
  json: boolean;
  help: boolean;
}

/**
 * El repositorio del que cuelga un `cc.json`: su carpeta, o la de arriba si el
 * fichero vive en `.codarch/`. Las capturas van al lado del proyecto, no de un
 * fichero suelto.
 */
export function repositoryOf(file: string): string {
  const directory = path.dirname(path.resolve(file));
  return path.basename(directory) === ".codarch"
    ? path.dirname(directory)
    : directory;
}

const numberFormat = new Intl.NumberFormat("es-ES");

function field(label: string, value: string): string {
  return `  ${label.padEnd(12)} ${value}`;
}

/**
 * Una captura del mapa, con el área y el color que se pidan (ADR 0091).
 *
 * Escribe en `.codarch/shots/` —dos ranuras que rotan— o donde diga `--out`.
 * Imprime la ruta, la ranura y el resumen que hace legible la imagen: el PNG no
 * lleva texto, así que los nombres de las celdas grandes van aquí.
 */
export function runShot(options: ShotCommandOptions): number {
  if (!options.file) {
    console.error(
      "falta la ruta del fichero cc.json\n\n  codarch shot <fichero.cc.json[.gz]> [--area <métrica>] [--color <modo>]"
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

  let shot;
  try {
    shot = captureMap(cc, repositoryOf(options.file), {
      areaMetric: options.area,
      color: options.color,
      width: options.width,
      height: options.height,
      out: options.out
    });
  } catch (error) {
    if (error instanceof RenderError || error instanceof RangeError) {
      console.error(`no se pudo capturar el mapa: ${error.message}`);
      return 1;
    }
    throw error;
  }

  if (options.json) {
    console.log(JSON.stringify(shot, null, 2));
    return 0;
  }

  const lines: string[] = [];
  lines.push("");
  lines.push("  CodArch · captura del mapa");
  lines.push("");
  lines.push(field("fichero", shot.file));
  if (shot.slot > 0) {
    lines.push(field("ranura", `${shot.slot} de 2 (rota sobre la más antigua)`));
  }
  lines.push(field("área", shot.summary.area ?? "—"));
  lines.push(field("color", shot.summary.color));
  lines.push(
    field(
      "tamaño",
      `${numberFormat.format(shot.summary.width)}x${numberFormat.format(shot.summary.height)} · ${formatBytes(shot.bytes)}`
    )
  );
  if (shot.summary.legend.length > 0) {
    lines.push(
      field("leyenda", shot.summary.legend.map((entry) => entry.label).join(" · "))
    );
  }
  if (shot.summary.cells.length > 0) {
    lines.push(field("mayor", shot.summary.cells[0]?.path ?? "—"));
  }
  lines.push("");
  console.log(lines.join("\n"));
  return 0;
}
