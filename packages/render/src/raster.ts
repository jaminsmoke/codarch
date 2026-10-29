import { fileFill } from "./color";
import { layoutMap, type PlacedNode } from "./layout";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./layout";
import type { RenderMetric, RenderModel } from "./model";

/**
 * El mapa, en píxeles.
 *
 * Es el mismo layout que pinta la app —`layoutMap` y `colorForFile`— volcado a
 * una rejilla de colores, sin texto: las celdas son rectángulos y un rectángulo
 * no necesita tipografía. Los nombres viajan al lado, en el resumen que
 * devuelve la captura, porque pintarlos pediría una fuente y un rasterizador
 * de glifos que este paquete no tiene (ADR 0091).
 *
 * Todo aquí es determinista: el mismo modelo y el mismo tamaño dan los mismos
 * bytes, sin orden de filesystem ni marcas de tiempo.
 */

export interface Raster {
  width: number;
  height: number;
  /** RGBA, cuatro bytes por píxel, fila a fila. */
  pixels: Uint8Array;
}

/** El papel del mapa, el mismo tono que el lienzo de la app. */
const PAPER = "#f7f5f1";

/** La línea que separa una carpeta de sus hijos. */
const FRAME = "#cfc8bc";

type Rgb = readonly [number, number, number];

function rgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16)
  ];
}

const PAPER_RGB = rgb(PAPER);
const FRAME_RGB = rgb(FRAME);

/** El tamaño mínimo y máximo de una captura, para no pedir un mapa de 4 px. */
export const MIN_SHOT = 160;
export const MAX_SHOT = 4096;

class Bitmap {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height * 4);
    this.fillRect(0, 0, width, height, PAPER_RGB);
  }

  /** Pinta un rectángulo, recortado al lienzo y con al menos un píxel. */
  fillRect(
    x: number,
    y: number,
    w: number,
    h: number,
    [r, g, b]: Rgb
  ): void {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.width, Math.round(x) + Math.max(1, Math.round(w)));
    const y1 = Math.min(this.height, Math.round(y) + Math.max(1, Math.round(h)));

    for (let py = y0; py < y1; py++) {
      let offset = (py * this.width + x0) * 4;
      for (let px = x0; px < x1; px++) {
        this.pixels[offset] = r;
        this.pixels[offset + 1] = g;
        this.pixels[offset + 2] = b;
        this.pixels[offset + 3] = 255;
        offset += 4;
      }
    }
  }

  /** Un rectángulo hueco de un píxel: el marco de una carpeta. */
  strokeRect(x: number, y: number, w: number, h: number, color: Rgb): void {
    this.fillRect(x, y, w, 1, color);
    this.fillRect(x, y + h - 1, w, 1, color);
    this.fillRect(x, y, 1, h, color);
    this.fillRect(x + w - 1, y, 1, h, color);
  }
}

/**
 * Vuelca el mapa a píxeles.
 *
 * Las carpetas se pintan como marcos —de un píxel, para que se lean las cajas
 * sin tapar a los ficheros— y los ficheros con su color, igual que en la app.
 */
export function rasterizeMap(
  model: RenderModel,
  width = VIEW_WIDTH,
  height = VIEW_HEIGHT
): Raster {
  const bitmap = new Bitmap(width, height);
  const metricIndex = model.initialMetric
    ? model.metrics.findIndex((metric) => metric.key === model.initialMetric)
    : -1;
  const metric =
    metricIndex >= 0 ? (model.metrics[metricIndex] as RenderMetric) : undefined;

  const draw = (placed: PlacedNode): void => {
    const { node, rect } = placed;
    if (node.kind === "file") {
      const file = node.fileIndex === undefined ? undefined : model.files[node.fileIndex];
      if (!file) return;
      bitmap.fillRect(rect.x, rect.y, rect.w, rect.h, rgb(fileFill(model, file, metricIndex, metric)));
      return;
    }

    bitmap.strokeRect(rect.x, rect.y, rect.w, rect.h, FRAME_RGB);
    for (const child of placed.children) draw(child);
  };

  for (const placed of layoutMap(model.roots, width, height)) draw(placed);
  return { width, height, pixels: bitmap.pixels };
}
