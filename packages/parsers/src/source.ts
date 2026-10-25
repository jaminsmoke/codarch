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
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0")) return null;
  if (normalized.startsWith("../") || normalized.includes("/../")) return null;

  const segments = normalized.split("/");
  if (segments.some((segment) => DENIED_SEGMENTS.has(segment))) return null;
  if (!SOURCE_EXTENSIONS.has(path.extname(normalized).toLowerCase())) return null;

  const rootPath = path.resolve(root);
  const file = path.resolve(rootPath, normalized);
  const prefix = rootPath.endsWith(path.sep) ? rootPath : `${rootPath}${path.sep}`;
  if (!file.startsWith(prefix)) return null;

  try {
    const stats = fs.statSync(file);
    if (!stats.isFile() || stats.size > MAX_BYTES) return null;
    const realRoot = fs.realpathSync(rootPath);
    const realFile = fs.realpathSync(file);
    const realPrefix = realRoot.endsWith(path.sep)
      ? realRoot
      : `${realRoot}${path.sep}`;
    if (!realFile.startsWith(realPrefix)) return null;
    const text = fs.readFileSync(file, "utf8");
    const all = text.split(/\r?\n/);
    const total = all.length;
    const first = Math.max(1, Math.trunc(start) || 1);
    const last = Math.min(
      total,
      Math.max(first, Math.trunc(end) || first),
      first + MAX_LINES - 1
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
