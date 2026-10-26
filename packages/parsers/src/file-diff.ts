import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { diffLines, type DiffRow } from "@codarch/metrics";
import { normalizeSourcePath, resolveSourceFile } from "./source";

/**
 * La vista de diferencias de un fichero (ADR 0077).
 *
 * El reporte dice que un fichero cambió y cuántas líneas entran y salen; la
 * vista de código dice **cuáles**. Se calcula a petición, cuando alguien abre
 * el desplegable: mandar el diff de todo el cambio con el reporte lo inflaría
 * para nadie.
 *
 * El lado de la base sale de `git show HEAD:<ruta>`, no de un export: aquí no
 * hace falta analizar nada, solo leer dos textos.
 */

export interface FileDiffView {
  path: string;
  status: "added" | "removed" | "changed";
  /** Líneas añadidas en todo el fichero, se pinten o no; `null` si no se midió. */
  added: number | null;
  removed: number | null;
  rows: DiffRow[];
  /** `true` cuando se recortó la vista por tamaño. */
  truncated: boolean;
}

/** Cuántas líneas de un fichero nuevo o borrado se enseñan enteras. */
const MAX_ROWS = 600;

/**
 * El diff del fichero contra el último commit, o `null` si no hay nada que
 * enseñar (no es código, no existe en ningún lado o git falla).
 */
export function readFileDiff(
  root: string,
  relativePath: string
): FileDiffView | null {
  const normalized = normalizeSourcePath(relativePath);
  if (!normalized) return null;

  const head = splitLines(readWorkingTree(root, normalized));
  const base = splitLines(readBase(root, normalized));
  if (!head && !base) return null;

  if (!base && head) return wholeFile(normalized, "added", head);
  if (base && !head) return wholeFile(normalized, "removed", base);

  const diff = diffLines(base ?? [], head ?? []);
  return {
    path: normalized,
    status: "changed",
    added: diff.added,
    removed: diff.removed,
    rows: diff.rows,
    truncated: diff.truncated
  };
}

/** Un fichero que solo está en un lado: todas sus líneas entran o salen. */
function wholeFile(
  path: string,
  status: "added" | "removed",
  lines: string[]
): FileDiffView {
  const added = status === "added";
  const rows: DiffRow[] = lines.slice(0, MAX_ROWS).map((text, index) => ({
    type: added ? "add" : "del",
    text,
    baseLine: added ? null : index + 1,
    headLine: added ? index + 1 : null
  }));

  return {
    path,
    status,
    added: added ? lines.length : 0,
    removed: added ? 0 : lines.length,
    rows,
    truncated: lines.length > rows.length
  };
}

/** El texto del árbol de trabajo, si el fichero existe. */
function readWorkingTree(root: string, relativePath: string): string | null {
  const file = resolveSourceFile(root, relativePath);
  if (!file) return null;
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

/**
 * El texto del último commit.
 *
 * `git show` no cambia los finales de línea, y da igual: al partir por
 * `\r?\n` los dos lados quedan comparables aunque el árbol use CRLF.
 */
function readBase(root: string, relativePath: string): string | null {
  try {
    return execFileSync("git", ["show", `HEAD:${relativePath}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 5_000_000
    });
  } catch {
    return null;
  }
}

/** Las líneas de un texto, sin la vacía que deja el salto final. */
function splitLines(text: string | null): string[] | null {
  if (text === null) return null;
  const lines = text.split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}
