import { deflateSync } from "node:zlib";

/**
 * Un PNG, escrito a mano.
 *
 * La captura del mapa son rectángulos de color: no hace falta un rasterizador
 * de SVG ni una dependencia nativa para eso, solo el formato. `zlib` viene con
 * node y el resto son cuatro trozos con su CRC (el mismo truco que usa
 * `scripts/make-icons.mjs` para los iconos).
 *
 * Este fichero importa `node:zlib`, así que solo lo usa la entrada de node
 * (`@codarch/render/node`): el navegador no lo ve nunca, y por eso el paquete
 * tiene dos entradas (ADR 0091).
 */

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/**
 * Codifica píxeles RGBA en un PNG de 8 bits por canal.
 *
 * Cada fila lleva su byte de filtro a cero: sin filtro no se comprime tan bien,
 * pero el resultado es el mismo en todas las plataformas y no depende de
 * heurísticas.
 */
export function encodePng(
  width: number,
  height: number,
  pixels: Uint8Array
): Buffer {
  if (width <= 0 || height <= 0) {
    throw new RangeError(`tamaño de imagen inválido: ${width}x${height}`);
  }
  const expected = width * height * 4;
  if (pixels.length !== expected) {
    throw new RangeError(
      `se esperaban ${expected} bytes de píxeles y llegaron ${pixels.length}`
    );
  }

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let row = 0; row < height; row++) {
    const from = row * width * 4;
    const to = row * (width * 4 + 1);
    raw[to] = 0;
    raw.set(pixels.subarray(from, from + width * 4), to + 1);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits por canal
  header[9] = 6; // RGBA
  header[10] = 0; // deflate
  header[11] = 0; // filtro adaptativo
  header[12] = 0; // sin entrelazado

  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}
