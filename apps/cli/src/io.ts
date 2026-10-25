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

/**
 * Qué le pasa a una ruta que debería ser una carpeta.
 *
 * El motivo se enseña tal cual, o `null` si la ruta sirve. Se comprueba antes
 * de tocar nada: un `mkdir` recursivo creaba la carpeta que se había escrito
 * mal y dejaba un snapshot vacío dentro.
 */
export function directoryProblem(target: string): string | null {
  let stat: ReturnType<typeof fs.statSync>;
  try {
    stat = fs.statSync(target);
  } catch {
    return `no existe ${target}`;
  }
  return stat.isDirectory() ? null : `${target} no es una carpeta`;
}

/** La misma comprobación para una ruta que debería ser un fichero. */
export function fileProblem(target: string): string | null {
  let stat: ReturnType<typeof fs.statSync>;
  try {
    stat = fs.statSync(target);
  } catch {
    return `no existe ${target}`;
  }
  if (stat.isDirectory()) return `${target} es una carpeta`;
  return stat.isFile() ? null : `${target} no es un fichero`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
