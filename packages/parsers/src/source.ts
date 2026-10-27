import fs from "node:fs";
import path from "node:path";

/**
 * Un trozo de código real para la ficha del símbolo (ADR 0067).
 *
 * El snapshot no guarda código: sería enorme y el checksum dejaría de hablar
 * solo de estructura. La app pide las líneas a la plataforma, que lee el
 * fichero del repo analizado. Este módulo es el lado Node, compartido por el
 * servidor local y el escritorio.
 */
export interface SourceSnippet {
  /** Ruta relativa al root del análisis, con `/`. */
  path: string;
  /** Primera línea devuelta, 1-based. */
  start: number;
  /** Última línea devuelta, 1-based e inclusiva. */
  end: number;
  /** Líneas totales del fichero. */
  total: number;
  lines: string[];
}

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs"
]);

const DENIED_SEGMENTS = new Set([
  ".git",
  "node_modules",
  ".codarch",
  ".codarch-history",
  "dist",
  "build",
  "coverage"
]);

const MAX_LINES = 400;
const MAX_BYTES = 1_000_000;

/**
 * Los topes del fichero entero, para verlo en el escenario.
 *
 * Son más altos que los de una muestra, pero siguen habiendo tope: la app no
 * carga un fichero de un millón de líneas ni uno de cuatro megas, y el panel
 * lo dice cuando se corta.
 */
const MAX_FILE_LINES = 5_000;
const MAX_FILE_BYTES = 4_000_000;

/**
 * La ruta relativa, normalizada, si tiene forma de fichero de código.
 *
 * No mira el disco: un fichero borrado del árbol sigue teniendo una ruta que
 * se puede pedir —su lado de la base— (ADR 0077). Devuelve `null` si la ruta
 * es absoluta, se sale del repo o apunta a algo que el análisis no mira.
 */
export function normalizeSourcePath(relativePath: string): string | null {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0")) return null;
  if (normalized.startsWith("../") || normalized.includes("/../")) return null;

  const segments = normalized.split("/");
  if (segments.some((segment) => DENIED_SEGMENTS.has(segment))) return null;
  if (!SOURCE_EXTENSIONS.has(path.extname(normalized).toLowerCase())) return null;
  return normalized;
}

/**
 * El fichero de código del repo, si existe y está dentro de él.
 *
 * Resuelve enlaces para que un symlink no saque la lectura del repo.
 */
export function resolveSourceFile(
  root: string,
  relativePath: string,
  maxBytes = MAX_BYTES
): string | null {
  const normalized = normalizeSourcePath(relativePath);
  if (!normalized) return null;

  const rootPath = path.resolve(root);
  const file = path.resolve(rootPath, normalized);
  const prefix = rootPath.endsWith(path.sep) ? rootPath : `${rootPath}${path.sep}`;
  if (!file.startsWith(prefix)) return null;

  try {
    const stats = fs.statSync(file);
    if (!stats.isFile() || stats.size > maxBytes) return null;
    const realRoot = fs.realpathSync(rootPath);
    const realFile = fs.realpathSync(file);
    const realPrefix = realRoot.endsWith(path.sep)
      ? realRoot
      : `${realRoot}${path.sep}`;
    if (!realFile.startsWith(realPrefix)) return null;
    return file;
  } catch {
    return null;
  }
}

/**
 * Lee las líneas de un fichero del repo.
 *
 * No acepta rutas absolutas, `..` ni ficheros fuera del root. Solo ficheros
 * de código y solo los directorios que el análisis mira. Devuelve `null` si no
 * hay nada que enseñar; el error de verdad no se filtra al renderer.
 */
export function readSourceSnippet(
  root: string,
  relativePath: string,
  start = 1,
  end = MAX_LINES
): SourceSnippet | null {
  return readLines(root, relativePath, start, end, MAX_LINES, MAX_BYTES);
}

/**
 * El fichero entero, para verlo en el escenario (ADR 0087).
 *
 * Mismas reglas de ruta y de tamaño relativo que una muestra, con los topes
 * del fichero: 5.000 líneas y 4 MB. Si el fichero es más largo, `end` lo dice
 * y la app avisa de que se ha cortado.
 */
export function readSourceFile(
  root: string,
  relativePath: string
): SourceSnippet | null {
  return readLines(root, relativePath, 1, MAX_FILE_LINES, MAX_FILE_LINES, MAX_FILE_BYTES);
}

function readLines(
  root: string,
  relativePath: string,
  start: number,
  end: number,
  maxLines: number,
  maxBytes: number
): SourceSnippet | null {
  const normalized = normalizeSourcePath(relativePath);
  if (!normalized) return null;
  const file = resolveSourceFile(root, normalized, maxBytes);
  if (!file) return null;

  try {
    const text = fs.readFileSync(file, "utf8");
    const all = text.split(/\r?\n/);
    const total = all.length;
    const first = Math.max(1, Math.trunc(start) || 1);
    const last = Math.min(
      total,
      Math.max(first, Math.trunc(end) || first),
      first + maxLines - 1
    );
    if (first > total) {
      return { path: normalized, start: first, end: first, total, lines: [] };
    }
    return {
      path: normalized,
      start: first,
      end: last,
      total,
      lines: all.slice(first - 1, last)
    };
  } catch {
    return null;
  }
}
