import fs from "node:fs";
import path from "node:path";
import type { CcJson, CcRestKind } from "@codarch/schema/browser";
import type { LintArtifact } from "@codarch/lint/browser";
import {
  fileFill,
  KIND_COLOR,
  KIND_LABEL,
  metricColor,
  riskColor
} from "./color";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./layout";
import {
  buildRenderModel,
  type RenderMetric,
  type RenderModel
} from "./model";
import { encodePng } from "./png";
import { MAX_SHOT, MIN_SHOT, rasterizeMap } from "./raster";
import { writeShot } from "./shots";

/**
 * La captura del mapa: un PNG con el área y el color que se pidan, más el
 * resumen que hace legible lo que el PNG no dice.
 *
 * La imagen es geometría, color y los nombres de las cajas grandes; la escala y
 * las cifras viajan en `summary`, que es lo que la tool del MCP devuelve junto a
 * la imagen (ADR 0091).
 */

export interface ShotOptions {
  /** Métrica que decide el área. Por defecto `rloc` o la de mayor cobertura. */
  areaMetric?: string;
  /** `risk`, `structure` o el nombre de una métrica. */
  color?: string;
  width?: number;
  height?: number;
  /** Ruta concreta del PNG; sin esto, ocupa una de las dos ranuras. */
  out?: string;
  /** El lint del repo: con él, el color de riesgo lleva su cuarta señal (ADR 0094). */
  lint?: LintArtifact | null;
}

export interface LegendEntry {
  label: string;
  color: string;
}

/** Una celda grande del mapa, para poder nombrar lo que se ve. */
export interface ShotCell {
  path: string;
  area: number;
  /** Valor de la métrica de color, si el color es una métrica. */
  value: number | null;
  fill: string;
}

export interface ShotSummary {
  project: string;
  /** Métrica del área, ya resuelta por el modelo. */
  area: string | null;
  /** Modo de color, ya resuelto: `risk`, `structure` o una métrica. */
  color: string;
  width: number;
  height: number;
  legend: LegendEntry[];
  /** Las celdas más grandes, por área y con desempate por ruta. */
  cells: ShotCell[];
}

export interface Shot {
  file: string;
  slot: number;
  bytes: number;
  summary: ShotSummary;
}

/** Cuántas celdas nombra el resumen. */
const NAMED_CELLS = 12;

/**
 * El nombre que la app le da al calor, que no es una métrica del snapshot.
 *
 * En el mapa «Calor (commits)» se pinta con esta métrica; aceptarla también aquí
 * ahorra el error raro de pedir un color que la app ofrece.
 */
const CHURN_ALIAS = "churn";
const CHURN_METRIC = "number_of_commits";

function checkSize(width: number, height: number): void {
  if (width < MIN_SHOT || height < MIN_SHOT) {
    throw new RangeError(
      `la captura no puede bajar de ${MIN_SHOT}x${MIN_SHOT} (pedida ${width}x${height})`
    );
  }
  if (width > MAX_SHOT || height > MAX_SHOT) {
    throw new RangeError(
      `la captura no puede pasar de ${MAX_SHOT}x${MAX_SHOT} (pedida ${width}x${height})`
    );
  }
}

/**
 * La captura en una ruta concreta.
 *
 * Sin ranura: quien dice dónde quiere el fichero no está mirando dos capturas,
 * está guardando una.
 */
function writeOut(out: string, png: Buffer): { file: string; slot: number } {
  const file = path.resolve(out);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
  return { file, slot: 0 };
}

/** El PNG del mapa, sin escribir nada en disco. */
export function renderMapPng(
  model: RenderModel,
  width = VIEW_WIDTH,
  height = VIEW_HEIGHT
): Buffer {
  checkSize(width, height);
  return encodePng(width, height, rasterizeMap(model, width, height).pixels);
}

/** La métrica con la que se pinta el mapa, si el color es una métrica. */
function colorMetricOf(model: RenderModel): RenderMetric | undefined {
  if (!model.initialMetric) return undefined;
  return model.metrics.find((entry) => entry.key === model.initialMetric);
}

/**
 * La leyenda del resumen.
 *
 * Lo que en la app es un degradado con sus extremos, aquí son sus dos colores:
 * el PNG no lleva cifras, así que la escala va en el resumen.
 */
function legendOf(model: RenderModel): LegendEntry[] {
  if (model.initialLens === "kind") {
    return (["doc", "config", "asset", "other"] as CcRestKind[]).map((kind) => ({
      label: KIND_LABEL[kind],
      color: KIND_COLOR[kind]
    }));
  }

  if (model.initialLens === "structure") {
    return model.sections.slice(0, 8).map((section) => ({
      label: section.label,
      color: section.color
    }));
  }

  if (model.initialLens === "risk") {
    return [
      { label: "riesgo bajo", color: riskColor(0) },
      { label: "riesgo medio", color: riskColor(0.5) },
      { label: "riesgo alto", color: riskColor(1) }
    ];
  }

  const metric = colorMetricOf(model);
  if (!metric) return [];
  return [
    { label: `${metric.title} ${metric.min}`, color: metricColor(metric.min, metric) },
    { label: `${metric.title} ${metric.max}`, color: metricColor(metric.max, metric) }
  ];
}

/** Las celdas más grandes del mapa, con su color, para poder nombrar la imagen. */
function cellsOf(model: RenderModel): ShotCell[] {
  const metric = colorMetricOf(model);
  const metricIndex =
    model.initialMetric === null
      ? -1
      : model.metrics.findIndex((entry) => entry.key === model.initialMetric);

  return [...model.files]
    .sort(
      (left, right) =>
        right.actualArea - left.actualArea || left.path.localeCompare(right.path)
    )
    .slice(0, NAMED_CELLS)
    .map((file) => ({
      path: file.path,
      area: file.actualArea,
      value: metricIndex >= 0 ? file.values[metricIndex] ?? null : null,
      fill: fileFill(model, file, metricIndex, metric)
    }));
}

/**
 * Construye el modelo, lo pinta y lo guarda en la ranura que toque.
 *
 * El modelo se construye aquí y no se recibe hecho porque el área y el color
 * son parte de la petición: la captura de un `risk` y la de un `rloc` son dos
 * mapas distintos del mismo snapshot. El lint entra igual que en la app: si el
 * repo lo tiene, el riesgo lo cuenta (ADR 0094).
 */
export function captureMap(
  cc: CcJson,
  root: string,
  options: ShotOptions = {}
): Shot {
  const width = options.width ?? VIEW_WIDTH;
  const height = options.height ?? VIEW_HEIGHT;
  checkSize(width, height);

  const wanted = options.color === CHURN_ALIAS ? CHURN_METRIC : options.color;
  const model = buildRenderModel(cc, {
    areaMetric: options.areaMetric,
    color: wanted,
    lint: options.lint ?? null
  });
  const png = renderMapPng(model, width, height);
  const written = options.out ? writeOut(options.out, png) : writeShot(root, png);

  return {
    file: written.file,
    slot: written.slot,
    bytes: png.length,
    summary: {
      project: model.meta.project,
      area: model.areaMetric,
      color: model.initialMetric ?? model.initialLens,
      width,
      height,
      legend: legendOf(model),
      cells: cellsOf(model)
    }
  };
}
