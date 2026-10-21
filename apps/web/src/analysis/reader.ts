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
  ".cjs"
] as const;

const CONFIG_FILES = new Set([
  "package.json",
  "tsconfig.json",
  "jsconfig.json"
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

  return { fileSystem: new MemoryFileSystem(files), count };
}

function isInteresting(name: string): boolean {
  if (CONFIG_FILES.has(name)) return true;
  const lower = name.toLowerCase();
  return SOURCE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}
