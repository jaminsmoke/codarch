import fs from "node:fs";
import zlib from "node:zlib";

export interface LoadedJson {
  json: unknown;
  /** Bytes en disco, antes de descomprimir. */
  bytes: number;
}

/** Lee un JSON, detectando gzip por los bytes mágicos y no por la extensión. */
export function readJsonFile(file: string): LoadedJson {
  const buffer = fs.readFileSync(file);
  const isGzip = buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
  const raw = isGzip ? zlib.gunzipSync(buffer) : buffer;
  const text = raw.toString("utf8");

  try {
    return { json: JSON.parse(text) as unknown, bytes: buffer.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`no es JSON válido: ${message}`);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
