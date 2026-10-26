/**
 * Genera los iconos de la app a partir de la marca que dibuja la cabecera.
 *
 * La geometría no vive aquí: se lee de `packages/ui/src/brand-mark.json`, que
 * es también lo que pinta `CodarchMark` en la interfaz. Así el icono del
 * escritorio, el favicon de la web y la marca de la cabecera son el mismo
 * dibujo, y cambiar la marca no obliga a tocar dos sitios.
 *
 * Los PNG se dibujan a mano sobre un búfer RGBA (no hay dependencias de imagen
 * en el repo) con supermuestreo y se codifican sin filtros; el SVG sale del
 * mismo JSON.
 */

import { deflateSync } from "node:zlib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARK_FILE = path.join(ROOT, "packages/ui/src/brand-mark.json");

/** Muestras por eje al dibujar; el resultado se reduce al tamaño pedido. */
const SUPERSAMPLE = 3;
/** Aire alrededor de la marca en los PNG: los iconos no llegan al borde. */
const MARGIN = 0.08;

const MARK = JSON.parse(await readFile(MARK_FILE, "utf8"));

function hexToRgba(hex) {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
    0xff
  ];
}

function createCanvas(size) {
  return { size, data: Buffer.alloc(size * size * 4) };
}

function putPixel(canvas, x, y, color) {
  if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) return;
  const offset = (y * canvas.size + x) * 4;
  canvas.data[offset] = color[0];
  canvas.data[offset + 1] = color[1];
  canvas.data[offset + 2] = color[2];
  canvas.data[offset + 3] = color[3];
}

function fillRect(canvas, x, y, w, h, color) {
  for (let row = y; row < y + h; row += 1) {
    for (let column = x; column < x + w; column += 1) {
      putPixel(canvas, column, row, color);
    }
  }
}

/** Esquina redondeada: el píxel entra si está dentro del radio. */
function insideRoundedRect(x, y, rect) {
  const { x: rx, y: ry, size, radius } = rect;
  if (x < rx || y < ry || x >= rx + size || y >= ry + size) return false;
  const nearLeft = x < rx + radius;
  const nearRight = x >= rx + size - radius;
  const nearTop = y < ry + radius;
  const nearBottom = y >= ry + size - radius;
  if (!(nearLeft || nearRight) || !(nearTop || nearBottom)) return true;
  const centerX = nearLeft ? rx + radius : rx + size - radius - 1;
  const centerY = nearTop ? ry + radius : ry + size - radius - 1;
  const dx = x - centerX;
  const dy = y - centerY;
  return dx * dx + dy * dy <= radius * radius;
}

/** Dibuja la marca en un búfer con `factor` muestras por eje. */
function draw(size, factor) {
  const canvas = createCanvas(size * factor);
  const margin = Math.round(size * MARGIN * factor);
  const span = canvas.size - margin * 2;
  const scale = span / MARK.viewBox;

  const background = {
    x: margin,
    y: margin,
    size: span,
    radius: MARK.background.radius * scale
  };
  const ink = hexToRgba(MARK.background.fill);
  for (let y = margin; y < margin + span; y += 1) {
    for (let x = margin; x < margin + span; x += 1) {
      if (insideRoundedRect(x, y, background)) putPixel(canvas, x, y, ink);
    }
  }

  for (const block of MARK.blocks) {
    fillRect(
      canvas,
      Math.round(margin + block.x * scale),
      Math.round(margin + block.y * scale),
      Math.max(1, Math.round(block.width * scale)),
      Math.max(1, Math.round(block.height * scale)),
      hexToRgba(block.fill)
    );
  }

  return canvas;
}

/** Reduce con la media de cada bloque de muestras, en alfa premultiplicado. */
function downsample(canvas, factor) {
  const size = canvas.size / factor;
  const out = createCanvas(size);
  const samples = factor * factor;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      for (let dy = 0; dy < factor; dy += 1) {
        for (let dx = 0; dx < factor; dx += 1) {
          const from = ((y * factor + dy) * canvas.size + x * factor + dx) * 4;
          const a = canvas.data[from + 3];
          red += canvas.data[from] * a;
          green += canvas.data[from + 1] * a;
          blue += canvas.data[from + 2] * a;
          alpha += a;
        }
      }
      const to = (y * size + x) * 4;
      out.data[to + 3] = Math.round(alpha / samples);
      if (alpha > 0) {
        out.data[to] = Math.round(red / alpha);
        out.data[to + 1] = Math.round(green / alpha);
        out.data[to + 2] = Math.round(blue / alpha);
      }
    }
  }
  return out;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(canvas) {
  const { size, data } = canvas;
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // filtro: ninguno
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits por canal
  header[9] = 6; // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

/** El mismo dibujo en SVG, para el favicon: nítido a cualquier tamaño. */
function markSvg() {
  const { viewBox, background, blocks } = MARK;
  const rect = (attributes) =>
    `  <rect ${attributes.map(([name, value]) => `${name}="${value}"`).join(" ")}/>`;
  const backgroundAttributes = [
    ["width", viewBox],
    ["height", viewBox],
    ["rx", background.radius],
    ["fill", background.fill]
  ];
  const lines = blocks.map((block) =>
    rect([
      ["x", block.x],
      ["y", block.y],
      ["width", block.width],
      ["height", block.height],
      ["fill", block.fill]
    ])
  );
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}" role="img" aria-label="CodArch">`,
    rect(backgroundAttributes),
    ...lines,
    "</svg>",
    ""
  ].join("\n");
}

const targets = [
  { file: "apps/desktop/build/icon.png", size: 512 },
  { file: "apps/web/public/icon.png", size: 512 },
  { file: "apps/web/public/favicon.png", size: 64 }
];

for (const target of targets) {
  const destination = path.join(ROOT, target.file);
  await mkdir(path.dirname(destination), { recursive: true });
  const png = encodePng(downsample(draw(target.size, SUPERSAMPLE), SUPERSAMPLE));
  await writeFile(destination, png);
  console.log(`ok · ${target.file} (${target.size}px)`);
}

const favicon = path.join(ROOT, "apps/web/public/favicon.svg");
await writeFile(favicon, markSvg());
console.log("ok · apps/web/public/favicon.svg");
