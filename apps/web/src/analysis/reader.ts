import { MemoryFileSystem } from "@codarch/parsers/fs";
import type { DirectoryHandleLike } from "../fs-access";

/**
 * Lee un repositorio del disco del usuario al fichero en memoria.
 *
 * El navegador no tiene `fs`, así que se recorre el directorio con File System
 * Access API y se guarda el contenido en un `MemoryFileSystem`: el mismo que
 * usa el analizador en el CLI, pero en memoria.
 *
 * Solo se leen los ficheros que el análisis necesita (código y configuración).
 * Java, Python y Go entran con la lista de lenguajes (ADR 0090).
 * Los directorios pesados se saltan al leer; el resto de las reglas del
 * `.gitignore` las aplica el walker del analizador.
 */

const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".java",
  ".py",
  ".go"
] as const;

const CONFIG_FILES = new Set([
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  ".codarch.yml",
  ".codarch.yaml",
  // El módulo de Go: sin él, sus imports se resuelven por sufijo.
  "go.mod"
]);

/** Directorios que no se leen: ruido y peso. */
const SKIPPED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  ".codarch",
  "dist",
  "build",
  "coverage",
  ".next",
  "out",
  "target",
  ".turbo",
  ".cache",
  ".venv",
  "__pycache__"
]);

export interface ReadProgress {
  /** Ficheros leídos hasta ahora. */
  read: number;
  /** Ruta del fichero en curso. */
  current: string;
}

export interface ReadResult {
  fileSystem: MemoryFileSystem;
  /** Ficheros leídos. */
  count: number;
}

export interface ReadOptions {
  onProgress?: (progress: ReadProgress) => void;
  /** Corta la lectura (el usuario cancela). */
  signal?: { aborted: boolean };
  /** Tope de ficheros, por si el repo es enorme. */
  limit?: number;
}

const DEFAULT_LIMIT = 20_000;

/**
 * Los ficheros de la última lectura del navegador, para enseñar el código de
 * un símbolo después de analizar (ADR 0067). No se guardan en el snapshot.
 */
let lastSources: Map<string, string> | null = null;

/** El código de un símbolo a partir de los ficheros del navegador. */
export function sourceFromMemory(
  path: string,
  start: number,
  end: number,
  /** Líneas que se devuelven como mucho: 400 en una muestra, más en el fichero entero. */
  limit = 400
): { path: string; start: number; end: number; total: number; lines: string[] } | null {
  const normalized = path.replaceAll("\\", "/").replace(/^\/+/, "");
  const source = lastSources?.get(`/${normalized}`) ?? lastSources?.get(normalized);
  if (source === undefined) return null;
  const all = source.split(/\r?\n/);
  const total = all.length;
  const first = Math.max(1, Math.trunc(start) || 1);
  const last = Math.min(
    total,
    Math.max(first, Math.trunc(end) || first),
    first + limit - 1
  );
  return {
    path: normalized,
    start: first,
    end: last,
    total,
    lines: all.slice(first - 1, last)
  };
}

export async function readDirectoryToMemory(
  root: DirectoryHandleLike,
  options: ReadOptions = {}
): Promise<ReadResult> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const files = new Map<string, string>();
  let count = 0;

  const walk = async (
    directory: DirectoryHandleLike,
    prefix: string
  ): Promise<void> => {
    if (options.signal?.aborted) return;
    if (count >= limit) return;

    for await (const [name, handle] of directory.entries()) {
      if (options.signal?.aborted) return;
      if (count >= limit) return;

      const path = prefix === "" ? `/${name}` : `${prefix}/${name}`;

      if (handle.kind === "directory") {
        if (SKIPPED_DIRECTORIES.has(name)) continue;
        await walk(handle, path);
        continue;
      }

      if (!isInteresting(name)) continue;
      const file = await handle.getFile();
      files.set(path, await file.text());
      count += 1;
      options.onProgress?.({ read: count, current: path });
    }
  };

  await walk(root, "");

  if (count >= limit) {
    // Se ha tocado el tope: el snapshot no sería completo y el checksum no
    // casaría con el del CLI. Mejor decirlo.
    throw new Error(
      `Se han leído ${count} ficheros, el tope de la análise en el navegador. Analiza el repositorio con "codarch analyze" para verlos todos.`
    );
  }

  lastSources = files;
  return { fileSystem: new MemoryFileSystem(files), count };
}

function isInteresting(name: string): boolean {
  if (CONFIG_FILES.has(name)) return true;
  const lower = name.toLowerCase();
  return SOURCE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}
