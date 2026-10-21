/**
 * Genera los iconos de la app: un treemap mínimo con la paleta del producto.
 *
 * Se dibuja a mano sobre un búfer RGBA y se codifica en PNG (no hay
 * dependencias de imagen en el repo). El mismo diseño sirve para el icono del
 * escritorio, el favicon de la web y el instalador de cada plataforma.
 */

import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const INK = [0x12, 0x1a, 0x20, 0xff];
const PALETTE = {
  a: [0xb9, 0xc4, 0xd0, 0xff],
  b: [0xc9, 0xb8, 0xa8, 0xff],
  c: [0xa9, 0xbf, 0xae, 0xff],
  d: [0xc4, 0xb6, 0xc9, 0xff],
  accent: [0xd9, 0x5d, 0x39, 0xff]
};

/** El diseño, en coordenadas de 512 y con margen. */
const SHAPE = {
  background: { x: 40, y: 40, size: 432, radius: 96 },
  blocks: [
    { x: 40, y: 40, w: 240, h: 432, color: "a" },
    { x: 40, y: 352, w: 120, h: 120, color: "accent" },
    { x: 296, y: 40, w: 176, h: 144, color: "b" },
    { x: 296, y: 200, w: 176, h: 144, color: "c" },
    { x: 296, y: 360, w: 176, h: 112, color: "d" }
  ]
};

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

/** Esquina redondeada: el píbel entra si está dentro del radio. */
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

function draw(size) {
  const canvas = createCanvas(size);
  const scale = size / 512;

  const background = SHAPE.background;
  const bgX = Math.round(background.x * scale);
  const bgY = Math.round(background.y * scale);
  const bgSize = Math.round(background.size * scale);
  const radius = Math.max(1, Math.round(background.radius * scale));
  for (let y = bgY; y < bgY + bgSize; y += 1) {
    for (let x = bgX; x < bgX + bgSize; x += 1) {
      if (insideRoundedRect(x, y, { ...background, x: bgX, y: bgY, size: bgSize, radius })) {
        putPixel(canvas, x, y, INK);
      }
    }
  }

  for (const block of SHAPE.blocks) {
    const x = Math.round(block.x * scale);
    const y = Math.round(block.y * scale);
    const w = Math.max(1, Math.round(block.w * scale));
    const h = Math.max(1, Math.round(block.h * scale));
    fillRect(canvas, x, y, w, h, PALETTE[block.color]);
  }

  return canvas;
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

const targets = [
  { file: "apps/desktop/build/icon.png", size: 512 },
  { file: "apps/web/public/icon.png", size: 512 },
  { file: "apps/web/public/favicon.png", size: 64 }
];

for (const target of targets) {
  const destination = path.join(ROOT, target.file);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, encodePng(draw(target.size)));
  console.log(`ok · ${target.file} (${target.size}px)`);
}
