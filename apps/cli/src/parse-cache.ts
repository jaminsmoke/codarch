import fs from "node:fs";
import path from "node:path";
import {
  PARSE_CACHE_FORMAT,
  TS_PARSER_NAME,
  type CachedParse,
  type ParseCache
} from "@codarch/parsers";


/**
 * La caché de parseo de un alcance, en su `.codarch/`.
 *
 * Es derivada y se puede borrar: solo cuesta tiempo volver a parsear. Un
 * alcance la escribe, y el análisis que lo contiene la lee **hacia abajo**
 * (ADR 0089) para no repetir el parseo de los ficheros que ya están parseados.
 * Hacia arriba no se lee nunca.
 *
 * Una caché solo vale si su formato, su parser y su raíz coinciden; si algo no
 * cuadra se ignora entera y se analiza, que es el resultado correcto.
 */

export const PARSE_CACHE_FILE = "parse-cache.json";

/** Una caché más grande que esto no se lee: es estado roto, no caché. */
const MAX_BYTES = 64 * 1024 * 1024;

interface CachePayload {
  format: number;
  parser: string;
  root: string;
  entries: Record<string, CachedParse>;
}

export function parseCachePath(outDirectory: string): string {
  return path.join(outDirectory, PARSE_CACHE_FILE);
}

/** Guarda el parseo de esta pasada para el análisis que venga por encima. */
export function writeParseCache(
  outDirectory: string,
  root: string,
  cache: ParseCache
): void {
  const entries: Record<string, CachedParse> = {};
  for (const [relativePath, entry] of cache.list()) {
    entries[relativePath] = entry;
  }

  const payload: CachePayload = {
    format: PARSE_CACHE_FORMAT,
    parser: TS_PARSER_NAME,
    root: path.resolve(root),
    entries
  };

  fs.mkdirSync(outDirectory, { recursive: true });
  fs.writeFileSync(
    parseCachePath(outDirectory),
    `${JSON.stringify(payload)}\n`,
    "utf8"
  );
}

/**
 * Las entradas que los alcances de debajo dejan al padre.
 *
 * Se reindexan con el prefijo del alcance (`apps/desktop/src/b.ts`), porque la
 * clave de la caché es la ruta relativa a quien la escribió. Un fichero que ya
 * no existe o que cambió no se reutiliza: la versión guardada no coincide.
 */
export function loadDescendantParseCaches(
  cache: ParseCache,
  root: string,
  scopePaths: readonly string[]
): { scopes: number; entries: number } {
  let usedScopes = 0;
  let entries = 0;

  for (const scopePath of scopePaths) {
    const directory = path.join(root, scopePath, ".codarch");
    const file = parseCachePath(directory);
    const payload = readPayload(file);
    if (!payload) continue;
    if (payload.format !== PARSE_CACHE_FORMAT || payload.parser !== TS_PARSER_NAME) {
      continue;
    }
    if (!samePath(payload.root, path.join(root, scopePath))) continue;

    let loaded = 0;
    for (const [relativePath, entry] of Object.entries(payload.entries)) {
      if (!isCachedParse(entry)) continue;
      cache.set(`${scopePath}/${relativePath}`, entry);
      loaded += 1;
    }

    if (loaded > 0) {
      usedScopes += 1;
      entries += loaded;
    }
  }

  return { scopes: usedScopes, entries };
}

function readPayload(file: string): CachePayload | null {
  let raw: unknown;
  try {
    if (fs.statSync(file).size > MAX_BYTES) return null;
    raw = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;

  const payload = raw as Partial<CachePayload>;
  if (
    typeof payload.format !== "number" ||
    typeof payload.parser !== "string" ||
    typeof payload.root !== "string" ||
    typeof payload.entries !== "object" ||
    payload.entries === null
  ) {
    return null;
  }
  return payload as CachePayload;
}

function isCachedParse(value: unknown): value is CachedParse {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<CachedParse>;
  const parsed = entry.parsed;
  return (
    typeof entry.version === "string" &&
    typeof entry.bridge === "boolean" &&
    typeof parsed === "object" &&
    parsed !== null &&
    Array.isArray(parsed.imports) &&
    typeof parsed.metrics === "object" &&
    parsed.metrics !== null
  );
}

/** La misma carpeta, con la misma ortografía que usa el sistema. */
function samePath(left: string, right: string): boolean {
  const a = path.resolve(left);
  const b = path.resolve(right);
  return process.platform === "win32"
    ? a.toLowerCase() === b.toLowerCase()
    : a === b;
}
