import { fileFill, inkFor } from "./color";
import { clipText, GLYPH_HEIGHT, glyphRows, GLYPH_WIDTH } from "./font";
import { layoutMap, type PlacedNode } from "./layout";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./layout";
import type { RenderMetric, RenderModel } from "./model";

/**
 * El mapa, en píxeles.
 *
 * Es el mismo layout que pinta la app —`layoutMap` y `colorForFile`— volcado a
 * una rejilla de colores, con los nombres de las cajas grandes y de las
 * carpetas escritos con la fuente de mapa de bits del paquete (ADR 0091). Los
 * umbrales son los del SVG: una caja que en la app no lleva nombre tampoco lo
 * lleva aquí, y una que sí lo lleva lo lleva en el mismo sitio.
 *
 * El resumen que acompaña a la imagen sigue haciendo falta: el PNG no sabe
 * escribir la escala ni las cifras, y su letra no se puede seleccionar.
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

/** La tinta de una cabecera de carpeta: la que la app pone sobre el papel. */
const HEADER_INK_RGB = rgb(inkFor(PAPER));

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

  /**
   * Un texto con la fuente de mapa de bits.
   *
   * Cada píxel del glifo se pinta como un cuadrado de `scale` de lado, así que
   * a 2x la letra mide 14 px de alto. Se recorta al lienzo como todo lo demás.
   */
  text(x: number, y: number, text: string, scale: number, color: Rgb): void {
    let cursor = Math.round(x);
    const top = Math.round(y);

    for (const char of text) {
      for (let row = 0; row < GLYPH_HEIGHT; row++) {
        const bits = glyphRows(char)[row] ?? 0;
        for (let column = 0; column < GLYPH_WIDTH; column++) {
          if ((bits & (1 << (GLYPH_WIDTH - 1 - column))) === 0) continue;
          this.fillRect(cursor + column * scale, top + row * scale, scale, scale, color);
        }
      }
      cursor += (GLYPH_WIDTH + 1) * scale;
    }
  }
}

/**
 * El nombre de un fichero, dentro de su caja.
 *
 * Los umbrales son los del SVG: 44x13 como mínimo para una línea, y dos —nombre
 * y extensión— cuando la caja da para ellas. La escala sube a 2x en las cajas
 * grandes, que es donde el nombre se lee de verdad.
 */
function labelFile(bitmap: Bitmap, placed: PlacedNode, name: string, ink: Rgb): void {
  const { rect } = placed;
  if (rect.w < 44 || rect.h < 13) return;

  const scale = rect.w >= 64 && rect.h >= 34 ? 2 : 1;
  const lineHeight = GLYPH_HEIGHT * scale;
  const room = rect.w - 8;
  const dot = name.lastIndexOf(".");
  const twoLines =
    rect.h >= lineHeight * 2 + 6 && rect.w >= 64 && dot > 0 && dot < name.length - 1;

  if (twoLines) {
    const base = clipText(name.slice(0, dot), room, scale);
    const extension = clipText(name.slice(dot), room, scale);
    if (base) bitmap.text(rect.x + 4, rect.y + 4, base, scale, ink);
    if (extension) bitmap.text(rect.x + 4, rect.y + 4 + lineHeight + 2, extension, scale, ink);
    return;
  }

  const label = clipText(name, room, scale);
  if (label) bitmap.text(rect.x + 4, rect.y + 4, label, scale, ink);
}

/**
 * El nombre de una carpeta, en su cabecera.
 *
 * Solo cuando el layout le ha reservado cabecera —un hueco de 13 o 17 px— y la
 * caja da para el nombre centrado en ella. El recuento de ficheros no se pinta:
 * en el PNG no cabe con sentido y el resumen ya lo dice por las celdas.
 */
function labelFolder(bitmap: Bitmap, placed: PlacedNode, name: string, ink: Rgb): void {
  const { rect, headerHeight } = placed;
  if (headerHeight < 13 || rect.w < 30) return;

  const scale = headerHeight >= 17 ? 2 : 1;
  const label = clipText(name, rect.w - 8, scale);
  if (!label) return;

  const top = rect.y + Math.max(1, Math.floor((headerHeight - GLYPH_HEIGHT * scale) / 2));
  bitmap.text(rect.x + 4, top, label, scale, ink);
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
      const fill = fileFill(model, file, metricIndex, metric);
      bitmap.fillRect(rect.x, rect.y, rect.w, rect.h, rgb(fill));
      labelFile(bitmap, placed, file.name, rgb(inkFor(fill)));
      return;
    }

    bitmap.strokeRect(rect.x, rect.y, rect.w, rect.h, FRAME_RGB);
    labelFolder(bitmap, placed, node.name, HEADER_INK_RGB);
    for (const child of placed.children) draw(child);
  };

  for (const placed of layoutMap(model.roots, width, height)) draw(placed);
  return { width, height, pixels: bitmap.pixels };
}
